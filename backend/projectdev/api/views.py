from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, UserSerializer, PostSerializer, CommentSerializer, LikeSerializer, ProfileSerializer
from .models import Post, Like, Comment, Profile
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from .pagination import PostCursorPagination
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.contrib.auth import authenticate

@api_view(["GET"])
@permission_classes([AllowAny])
def posts(request):
    posts = Post.objects.all().order_by('-create_at')
    paginator = PostCursorPagination()
    result_page = paginator.paginate_queryset(posts, request)
    return paginator.get_paginated_response(PostSerializer(result_page, many=True, context={'request': request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_post(request):
    data = request.data.copy()
    if "code" in data and data["code"]:
        data["code"] = data["code"].replace("\\n", "\n")
    serializer = PostSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_post(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error':'Post not found'}, status=400)
    
    if post.user != request.user:
        return Response({'error':'Unauthorized action.'}, status=403)
    
    post.delete()
    return Response({'message':'Post deleted successfully.'}, status=204)

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_post(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error':'Post not found'}, status=404)

    if post.user != request.user:
        return Response({'error':'Unauthorized action.'}, status=403)

    serializer = PostSerializer(post, data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=200)
    return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({'message':'User created successfully', 'user':UserSerializer(user).data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    user = authenticate(
        username = request.data['username'],
        password = request.data['password']
    )
    if user is None:
        return Response({'error':'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    response = Response({'access': str(refresh.access_token)}, status=status.HTTP_200_OK)

    response.set_cookie(
        key='refresh_token',
        value=str(refresh),
        httponly=True,
        secure=False, # Set to True in production with HTTPS
        samesite='Lax',
    )
    return response

@api_view(["POST"])
@permission_classes([AllowAny])
def cookie_token_refresh(request):
    """
    Custom view to read the refresh token from an HttpOnly cookie
    instead of expecting it in the request body.
    """
    refresh_token = request.COOKIES.get('refresh_token')
    if not refresh_token:
        return Response({'detail': 'Refresh token not found in cookies.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
    
    if serializer.is_valid():
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    
    return Response({'detail': 'Refresh token is invalid or expired.'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def like_toggle(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=404)

    like, created = Like.objects.get_or_create(user=request.user, post=post)

    if not created:
        like.delete()
        post.like_count -= 1
    else:
        post.like_count += 1

    post.save()
    return Response({'like_count': post.like_count}, status=200)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_comment(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error':'Post not found'}, status=404)

    serializer = CommentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user, post=post)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile_view(request, username):
    if username == "me" and request.user.is_authenticated:
        username = request.user.username
    
    try:
        user = User.objects.get(username=username)
        profile, created = Profile.objects.get_or_create(user=user)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
        
    if request.method == "GET":
        serializer = ProfileSerializer(profile, context={'request': request})
        
        # also get posts created by the user
        posts = Post.objects.filter(user=user).order_by('-create_at')
        posts_serializer = PostSerializer(posts, many=True, context={'request': request})
        
        data = serializer.data
        data['posts'] = posts_serializer.data
        return Response(data, status=200)

    elif request.method == "PUT":
        if user != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
            
        serializer = ProfileSerializer(profile, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_follow(request, username):
    try:
        user_to_follow = User.objects.get(username=username)
        profile_to_follow, created = Profile.objects.get_or_create(user=user_to_follow)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
        
    if user_to_follow == request.user:
        return Response({'error': 'You cannot follow yourself'}, status=400)
        
    if profile_to_follow.followers.filter(id=request.user.id).exists():
        profile_to_follow.followers.remove(request.user)
        is_following = False
    else:
        profile_to_follow.followers.add(request.user)
        is_following = True
        
    return Response({'is_following': is_following, 'followers_count': profile_to_follow.followers.count()}, status=200)


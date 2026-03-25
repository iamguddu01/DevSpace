import re
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Post, Like, Comment, Profile

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password2']
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Password not matched.")
            
        password = data['password']
        if len(password) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', password):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'\d', password):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r'[@$!%*?&]', password):
            raise serializers.ValidationError("Password must contain at least one special character (@$!%*?&).")
             
        return data
    
    def create(self, validated_data):
        username = validated_data['username']
        email = validated_data['email']
        password = validated_data['password']
        user = User.objects.create_user(username=username, email=email, password=password)
        return user
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
    
class CommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'username', 'post']

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'user', 'name', 'bio', 'profile_picture', 'username', 'followers_count', 'following_count', 'posts_count', 'is_following', 'is_owner']
        read_only_fields = ['user', 'username']

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.user.following.count()

    def get_posts_count(self, obj):
        return Post.objects.filter(user=obj.user).count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.followers.filter(id=request.user.id).exists()
        return False
        
    def get_is_owner(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.user

class PostSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    author_name = serializers.SerializerMethodField()
    author_profile_picture = serializers.SerializerMethodField()
    is_following_author = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = ['user', 'create_at', 'username']

    def get_author_name(self, obj):
        try:
            return obj.user.profile.name
        except Exception:
            return None

    def get_author_profile_picture(self, obj):
        request = self.context.get('request')
        try:
            profile = obj.user.profile
            if profile.profile_picture:
                url = profile.profile_picture.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
        return None

    def get_is_following_author(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                return obj.user.profile.followers.filter(id=request.user.id).exists()
            except Exception:
                pass
        return False

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
        
    def get_is_owner(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.user
        


class LikeSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Like
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'username']
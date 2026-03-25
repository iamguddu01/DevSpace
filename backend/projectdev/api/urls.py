from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', views.register),
    path('login/', views.login),
    path('token/refresh/', views.cookie_token_refresh, name='token_refresh'),
    path('post/', views.posts),
    path('post/add/', views.add_post),
    path('post/delete/<int:post_id>/', views.delete_post),
    path('post/update/<int:post_id>/', views.update_post),
    path('post/<int:post_id>/like/', views.like_toggle),
    path('post/<int:post_id>/comment/', views.add_comment),
    path('profile/<str:username>/', views.profile_view),
    path('profile/<str:username>/follow/', views.toggle_follow),
]

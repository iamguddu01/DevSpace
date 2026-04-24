import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge, Image, Dropdown, Modal, Form, InputGroup } from 'react-bootstrap';
import { authFetch } from '../utils/auth';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({ caption: '', code: '', language: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [visibleComments, setVisibleComments] = useState({});
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState({ name: '', bio: '', profile_picture: null });
  const [profileActionLoading, setProfileActionLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/profile/${username}/`);
      const data = await response.json();
      if (response.ok) {
        setProfile(data);
        setFollowing(data.is_following);
        setFollowersCount(data.followers_count);
      } else {
        setError(data.error || 'Failed to fetch profile');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const response = await authFetch(`/profile/${username}/follow/`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setFollowing(data.is_following);
        setFollowersCount(data.followers_count);
      } else {
        alert(data.error || 'Failed to follow/unfollow');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (post) => {
    setEditingPost(post);
    setEditForm({
      caption: post.caption || '',
      code: post.code || '',
      language: post.language || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const response = await authFetch(`/post/delete/${postId}/`, { method: 'DELETE' });
      if (response.ok || response.status === 204) {
        setProfile(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId), posts_count: prev.posts_count - 1 }));
      } else {
        alert("Failed to delete post.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitEdit = async () => {
    if (!editingPost) return;
    setActionLoading(true);
    try {
      const response = await authFetch(`/post/update/${editingPost.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        const updatedPost = await response.json();
        setProfile(prev => ({
          ...prev, 
          posts: prev.posts.map(p => p.id === editingPost.id ? { ...p, ...updatedPost } : p)
        }));
        setShowEditModal(false);
      } else {
        alert("Failed to update post.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProfileClick = () => {
    setProfileEditForm({
      name: profile.name || '',
      bio: profile.bio || '',
      profile_picture: null,
    });
    setShowProfileEditModal(true);
  };

  const submitProfileEdit = async () => {
    setProfileActionLoading(true);
    try {
      const formData = new FormData();
      if (profileEditForm.name) formData.append('name', profileEditForm.name);
      if (profileEditForm.bio) formData.append('bio', profileEditForm.bio);
      if (profileEditForm.profile_picture) formData.append('profile_picture', profileEditForm.profile_picture);
      
      const response = await authFetch(`/profile/${username}/`, {
        method: 'PUT',
        body: formData,
      });
      
      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(prev => ({...prev, ...updatedProfile, posts: prev.posts}));
        setShowProfileEditModal(false);
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileActionLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await authFetch(`/post/${postId}/like/`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({
          ...prev,
          posts: prev.posts.map(p => p.id === postId ? { ...p, is_liked: !p.is_liked, like_count: data.like_count } : p)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentChange = (postId, value) => setCommentInputs(prev => ({ ...prev, [postId]: value }));
  const toggleComments = (postId) => setVisibleComments(prev => ({ ...prev, [postId]: !prev[postId] }));

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const content = commentInputs[postId];
    if (!content || !content.trim()) return;

    try {
      const response = await authFetch(`/post/${postId}/comment/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (response.ok) {
        const newComment = await response.json();
        setProfile(prev => ({
          ...prev,
          posts: prev.posts.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p)
        }));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const normalizeCode = (value) => {
    if (value == null) return '';
    const text = String(value);
    return text.replace(/\\n/g, '\n');
  };

  if (loading) return <Container className="d-flex justify-content-center py-5"><Spinner animation="border" /></Container>;
  if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
  if (!profile) return null;

  return (
    <Container className="py-4">
      <Row className="justify-content-center mb-4">
        <Col md={10} lg={8}>
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center p-4">
              <div className="mb-3">
                {profile.profile_picture ? (
                  <Image src={profile.profile_picture.startsWith('http') ? profile.profile_picture : `${API_BASE_URL}${profile.profile_picture}`} roundedCircle style={{ width: '120px', height: '120px', objectFit: 'cover' }} />
                ) : (
                  <div className="d-inline-flex justify-content-center align-items-center bg-secondary text-white rounded-circle" style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h4 className="fw-bold mb-1">{profile.name || profile.username}</h4>
              <p className="text-muted mb-3">@{profile.username}</p>
              
              {profile.bio && <p className="mb-4 px-md-5">{profile.bio}</p>}

              <div className="d-flex justify-content-center gap-4 mb-4">
                <div className="text-center">
                  <h5 className="mb-0 fw-bold">{profile.posts_count}</h5>
                  <small className="text-muted">Posts</small>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 fw-bold">{followersCount}</h5>
                  <small className="text-muted">Followers</small>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 fw-bold">{profile.following_count}</h5>
                  <small className="text-muted">Following</small>
                </div>
              </div>

              {profile.is_owner ? (
                <Button 
                  variant="outline-primary" 
                  className="px-4 rounded-pill fw-bold"
                  onClick={handleEditProfileClick}
                >
                  Edit Profile
                </Button>
              ) : (
                <Button 
                  variant={following ? 'outline-primary' : 'primary'} 
                  className="px-4 rounded-pill fw-bold"
                  onClick={handleFollow}
                >
                  {following ? 'Following' : 'Follow'}
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <h5 className="mb-3 fw-bold">Posts</h5>
          {profile.posts && profile.posts.length > 0 ? (
            profile.posts.map(post => (
              <Card key={post.id} className="mb-4 shadow-sm border-0">
                  <Card.Header className="bg-transparent border-bottom-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <Link to={`/profile/${post.username}`} className="text-decoration-none">
                        {post.author_profile_picture ? (
                          <Image src={post.author_profile_picture.startsWith('http') ? post.author_profile_picture : `${API_BASE_URL}${post.author_profile_picture}`} roundedCircle style={{ width: '45px', height: '45px', objectFit: 'cover' }} className="me-3 shadow-sm" />
                        ) : (
                          <div className="d-inline-flex justify-content-center align-items-center bg-secondary text-white rounded-circle me-3 shadow-sm" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                            {post.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>
                      <div>
                        <div className="d-flex align-items-center mb-1">
                          <Link to={`/profile/${post.username}`} className="text-decoration-none text-dark d-flex align-items-center">
                            <strong className="me-2 text-primary">{post.author_name || post.username}</strong>
                            <small className="text-muted">@{post.username}</small>
                          </Link>
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {new Date(post.create_at).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </small>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <Badge bg={post.post_type === 'CODE' ? 'secondary' : 'info'}>
                        {post.post_type === 'CODE' ? 'Code Snippet' : 'Media'}
                      </Badge>
                      {post.is_owner && (
                        <Dropdown align="end" className="ms-2">
                          <Dropdown.Toggle variant="link" className="text-muted p-0 border-0 text-decoration-none shadow-none no-caret" style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                            ⋮
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="shadow-sm border-0">
                            <Dropdown.Item onClick={() => handleEditClick(post)}>Edit Post</Dropdown.Item>
                            <Dropdown.Item className="text-danger" onClick={() => handleDeleteClick(post.id)}>Delete Post</Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      )}
                    </div>
                  </Card.Header>

                  <Card.Body>
                    {post.caption && <Card.Text className="fs-5 mb-3">{post.caption}</Card.Text>}

                    {post.post_type === 'MEDIA' && post.image && (
                      <div className="text-center bg-body-tertiary rounded overflow-hidden">
                        <img
                          src={post.image.startsWith('http') ? post.image : `${API_BASE_URL}${post.image}`}
                          alt="Post Content"
                          className="img-fluid"
                          style={{ maxHeight: '500px', objectFit: 'contain' }}
                        />
                      </div>
                    )}

                    {post.post_type === 'CODE' && post.code && (
                      <div className="position-relative mt-2 shadow-sm rounded overflow-hidden">
                        <SyntaxHighlighter
                          language={post.language ? post.language.toLowerCase() : 'text'}
                          style={vscDarkPlus}
                          wrapLongLines
                          wrapLines
                          customStyle={{ margin: 0, padding: '1.5rem', borderRadius: '0.375rem', fontSize: '0.9rem', maxHeight: '500px', whiteSpace: 'pre-wrap' }}
                        >
                          {normalizeCode(post.code)}
                        </SyntaxHighlighter>
                      </div>
                    )}
                  </Card.Body>

                  <Card.Footer className="bg-transparent border-top pb-3">
                    <div className="d-flex align-items-center mb-2 mt-2">
                      <Button
                        variant={post.is_liked ? "danger" : "outline-danger"}
                        size="sm"
                        className="me-3 d-flex align-items-center rounded-pill px-3"
                        onClick={() => handleLike(post.id)}
                      >
                        <span className="me-2">{post.is_liked ? '❤️' : '🤍'}</span>
                        {post.like_count || 0}
                      </Button>
                      <Button
                        variant="link"
                        className="text-decoration-none text-muted p-0"
                        onClick={() => toggleComments(post.id)}
                      >
                        💬 {(post.comments && post.comments.length) || 0} Comments
                      </Button>
                    </div>

                    {visibleComments[post.id] && (
                      <div className="mt-3">
                        {post.comments && post.comments.length > 0 ? (
                          <div className="mb-3 px-2">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="mb-2">
                                <Link to={`/profile/${comment.username}`} className="text-decoration-none small text-primary fw-bold me-2">
                                  @{comment.username}
                                </Link>
                                <span className="small text-muted me-2" style={{ fontSize: '0.75rem' }}>
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                                <p className="mb-0 border p-2 rounded bg-body-tertiary" style={{ fontSize: '0.875rem' }}>
                                  {comment.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted small mb-2 px-2">No comments yet. Be the first to comment!</p>
                        )}
                        <Form onSubmit={(e) => handleCommentSubmit(e, post.id)}>
                          <InputGroup size="sm">
                            <Form.Control
                              placeholder="Write a comment..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => handleCommentChange(post.id, e.target.value)}
                              className="bg-body-tertiary border"
                              style={{ borderRadius: '20px 0 0 20px', paddingLeft: '15px' }}
                            />
                            <Button 
                               variant="primary" 
                               type="submit" 
                               disabled={!commentInputs[post.id]?.trim()}
                               style={{ borderRadius: '0 20px 20px 0' }}
                            >
                              Post
                            </Button>
                          </InputGroup>
                        </Form>
                      </div>
                    )}
                  </Card.Footer>
              </Card>
            ))
          ) : (
            <p className="text-muted text-center py-4 bg-body-tertiary rounded">No posts uploaded yet.</p>
          )}
        </Col>
      </Row>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Edit Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Caption</Form.Label>
              <Form.Control as="textarea" rows={3} value={editForm.caption} onChange={(e) => setEditForm(prev => ({...prev, caption: e.target.value}))} />
            </Form.Group>
            {editingPost && editingPost.post_type === 'CODE' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Language</Form.Label>
                  <Form.Control type="text" value={editForm.language} onChange={(e) => setEditForm(prev => ({...prev, language: e.target.value}))} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Code</Form.Label>
                  <Form.Control as="textarea" rows={6} className="font-monospace" value={editForm.code} onChange={(e) => setEditForm(prev => ({...prev, code: e.target.value}))} />
                </Form.Group>
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 bg-transparent">
          <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" className="rounded-pill px-4 fw-bold" onClick={submitEdit} disabled={actionLoading}>
            {actionLoading ? <Spinner size="sm" animation="border" /> : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showProfileEditModal} onHide={() => setShowProfileEditModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Name <span className="text-muted fw-normal">(Optional)</span></Form.Label>
              <Form.Control type="text" value={profileEditForm.name} onChange={(e) => setProfileEditForm(prev => ({...prev, name: e.target.value}))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Bio <span className="text-muted fw-normal">(Optional)</span></Form.Label>
              <Form.Control as="textarea" rows={3} value={profileEditForm.bio} onChange={(e) => setProfileEditForm(prev => ({...prev, bio: e.target.value}))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Profile Picture</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={(e) => setProfileEditForm(prev => ({...prev, profile_picture: e.target.files[0]}))} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 bg-transparent">
          <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setShowProfileEditModal(false)}>Cancel</Button>
          <Button variant="primary" className="rounded-pill px-4 fw-bold" onClick={submitProfileEdit} disabled={profileActionLoading}>
            {profileActionLoading ? <Spinner size="sm" animation="border" /> : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
}

export default Profile;

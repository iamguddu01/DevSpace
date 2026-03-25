import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Form, InputGroup, Dropdown, Modal, Image } from 'react-bootstrap';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { authFetch } from '../utils/auth';

function Post() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextUrl, setNextUrl] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [visibleComments, setVisibleComments] = useState({});
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({ caption: '', code: '', language: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const loadMoreRef = useRef(null);

  const normalizeCode = (value) => {
    if (value == null) return '';
    const text = String(value);
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  };

  const apiPathFromAbsoluteUrl = (url) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  };

  const dedupeById = (items) => {
    const map = new Map();
    for (const item of items) {
      if (item && item.id != null) map.set(item.id, item);
    }
    return Array.from(map.values());
  };

  const hasMore = useMemo(() => Boolean(nextUrl), [nextUrl]);

  const handleLike = async (postId) => {
    try {
      const response = await authFetch(`/post/${postId}/like/`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setPosts((prev) => prev.map(p => 
          p.id === postId 
            ? { ...p, is_liked: !p.is_liked, like_count: data.like_count }
            : p
        ));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleCommentChange = (postId, value) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const content = commentInputs[postId];
    if (!content || !content.trim()) return;

    try {
      const response = await authFetch(`/post/${postId}/comment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (response.ok) {
        const newComment = await response.json();
        setPosts((prev) => prev.map(p => 
          p.id === postId 
            ? { ...p, comments: [...(p.comments || []), newComment] }
            : p
        ));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const toggleComments = (postId) => {
    setVisibleComments(prev => ({ ...prev, [postId]: !prev[postId] }));
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
        setPosts(prev => prev.filter(p => p.id !== postId));
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
        setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...updatedPost } : p));
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

  const handleToggleFollow = async (usernameToFollow) => {
    try {
      const response = await authFetch(`/profile/${usernameToFollow}/follow/`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setPosts(prev => prev.map(p => 
          p.username === usernameToFollow ? { ...p, is_following_author: data.is_following } : p
        ));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await authFetch('/post/');
      const data = await response.json();

      if (response.ok) {
        setPosts(data.results || data);
        setNextUrl(data.next || null);
      } else {
        setError(data.detail || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Network error or server is unreachable');
    } finally {
      setLoading(false);
    }
  };

  const fetchMorePosts = useCallback(async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await authFetch(apiPathFromAbsoluteUrl(nextUrl));
      const data = await response.json();
      if (!response.ok) {
        setError(data.detail || 'Failed to fetch more posts');
        return;
      }
      const newPosts = data.results || [];
      setPosts((prev) => dedupeById([...prev, ...newPosts]));
      setNextUrl(data.next || null);
    } catch (err) {
      console.error('Error fetching more posts:', err);
      setError('Network error or server is unreachable');
    } finally {
      setLoadingMore(false);
    }
  }, [nextUrl, loadingMore]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!hasMore) return;

    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) fetchMorePosts();
      },
      { root: null, rootMargin: '600px 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, fetchMorePosts]);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          
          <h3 className="mb-4 fw-bold">Recent Posts</h3>

          {posts.length === 0 ? (
            <Card className="text-center p-5 border-0 shadow-sm bg-body-tertiary">
              <Card.Body>
                <h5 className="text-muted">No posts found</h5>
                <p className="mb-0">Be the first to create a post!</p>
              </Card.Body>
            </Card>
          ) : (
            <>
              {posts.map((post) => (
                <Card key={post.id} className="mb-4 shadow-sm border-0">
                  <Card.Header className="bg-transparent border-bottom-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <Link to={`/profile/${post.username}`} className="text-decoration-none">
                        {post.author_profile_picture ? (
                          <Image src={post.author_profile_picture.startsWith('http') ? post.author_profile_picture : `http://localhost:8000${post.author_profile_picture}`} roundedCircle style={{ width: '45px', height: '45px', objectFit: 'cover' }} className="me-3 shadow-sm" />
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
                          {!post.is_owner && (
                            <Button 
                              variant={post.is_following_author ? 'outline-primary' : 'primary'}
                              size="sm"
                              className="ms-3 rounded-pill fw-bold"
                              onClick={() => handleToggleFollow(post.username)}
                              style={{ padding: '0.1rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              {post.is_following_author ? 'Following' : 'Follow'}
                            </Button>
                          )}
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
                          src={post.image.startsWith('http') ? post.image : `http://localhost:8000${post.image}`}
                          alt="Post Content"
                          className="img-fluid"
                          style={{ maxHeight: '500px', objectFit: 'contain' }}
                        />
                      </div>
                    )}

                    {post.post_type === 'CODE' && post.code && (
                      <div className="position-relative mt-2 shadow-sm rounded overflow-hidden">
                        {post.language && (
                          <span
                            className="position-absolute top-0 end-0 m-3 px-2 py-1 bg-dark text-white rounded text-uppercase opacity-75"
                            style={{ fontSize: '12px', zIndex: 1, pointerEvents: 'none' }}
                          >
                            {post.language}
                          </span>
                        )}
                        <SyntaxHighlighter
                          language={post.language ? post.language.toLowerCase() : 'text'}
                          style={vscDarkPlus}
                          wrapLongLines
                          wrapLines
                          customStyle={{
                            margin: 0,
                            padding: '1.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.9rem',
                            maxHeight: '500px',
                            whiteSpace: 'pre-wrap'
                          }}
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
              ))}

              <div ref={loadMoreRef} />
              {loadingMore && (
                <div className="d-flex justify-content-center py-3">
                  <Spinner animation="border" variant="primary" />
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <div className="text-center text-muted py-2" style={{ fontSize: '14px' }}>
                  You’re all caught up.
                </div>
              )}
            </>
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

    </Container>
  );
}

export default Post;
  
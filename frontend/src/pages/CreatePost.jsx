import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/auth';

const CreatePost = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [postType, setPostType] = useState('MEDIA');
    const [caption, setCaption] = useState('');
    const [image, setImage] = useState(null);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('');

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (postType === 'MEDIA' && !image && !caption) {
            setError('Please provide an image or a caption for a Media Post.');
            setLoading(false);
            return;
        }
        if (postType === 'CODE' && (!code || !language)) {
            setError('Please provide both the Code Snippet and the Language.');
            setLoading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('post_type', postType);
            
            if (caption) {
                formData.append('caption', caption);
            }

            if (postType === 'MEDIA' && image) {
                formData.append('image', image);
            }

            if (postType === 'CODE') {
                formData.append('code', code);
                formData.append('language', language);
            }

            const response = await authFetch('/post/add/', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setSuccess('Post created successfully! Redirecting...');
                setTimeout(() => {
                    navigate('/'); // Redirect to Home Page
                }, 1500);
            } else {
                const data = await response.json();
                setError(data.error || data.detail || 'Failed to create post. Please check your inputs.');
            }
            
        } catch (err) {
            setError('Network error. Failed to reach the server.');
            console.error('Submit Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <Card className="shadow-sm border-0">
                        <Card.Body className="p-4 p-md-5">
                            <div className="text-center mb-4">
                                <h3 className="fw-bold">Create a New Post</h3>
                                <p className="text-muted">Share your code snippets or media with DevSpace</p>
                            </div>

                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                {/* Post Type Selection */}
                                <Form.Group className="mb-4" controlId="postType">
                                    <Form.Label className="fw-semibold">Post Type</Form.Label>
                                    <Form.Select 
                                        value={postType} 
                                        onChange={(e) => {
                                            setPostType(e.target.value);
                                            setError(''); // Clear errors when switching modes
                                        }}
                                        className="form-control-lg"
                                    >
                                        <option value="MEDIA">Media Post</option>
                                        <option value="CODE">Code Snippet</option>
                                    </Form.Select>
                                </Form.Group>

                                {/* Shared Field: Caption */}
                                <Form.Group className="mb-3" controlId="caption">
                                    <Form.Label className="fw-semibold">Caption <span className="text-muted fw-normal">(Optional)</span></Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="What's on your mind?"
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                    />
                                </Form.Group>

                                {/* Dynamic Fields for MEDIA POST */}
                                {postType === 'MEDIA' && (
                                    <Form.Group className="mb-4" controlId="image">
                                        <Form.Label className="fw-semibold">Upload Image</Form.Label>
                                        <Form.Control 
                                            type="file" 
                                            accept="image/*,video/*"
                                            onChange={handleImageChange}
                                        />
                                    </Form.Group>
                                )}

                                {/* Dynamic Fields for CODE SNIPPET */}
                                {postType === 'CODE' && (
                                    <>
                                        <Form.Group className="mb-3" controlId="language">
                                            <Form.Label className="fw-semibold">Language (e.g. JavaScript, Python)</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Enter programming language"
                                                value={language}
                                                onChange={(e) => setLanguage(e.target.value)}
                                                required={postType === 'CODE'}
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-4" controlId="code">
                                            <Form.Label className="fw-semibold">Code Block</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={6}
                                                placeholder="Paste your code here..."
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                className="font-monospace"
                                                required={postType === 'CODE'}
                                            />
                                        </Form.Group>
                                    </>
                                )}

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    className="w-100 py-2 fw-bold" 
                                    disabled={loading}
                                >
                                    {loading ? 'Publishing...' : 'Publish Post'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default CreatePost;

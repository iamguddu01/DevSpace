import { useState } from 'react';
import { Form, Button, Container, Row, Col, Alert, Card } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Basic frontend validation
        if (password !== passwordConfirm) {
            setError('Passwords do not match.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!passwordRegex.test(password)) {
            setError('Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character (@$!%*?&).');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:8000/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username, 
                    email, 
                    password, 
                    password2: passwordConfirm // The backend serializer expects password and password2
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Registration successful! Redirecting to login...');
                // Briefly show success message before redirecting
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            } else {
                // Determine error message from backend
                // The serializer might return errors as objects or arrays
                let errorMessage = 'Registration failed. Please check your inputs.';
                
                if (data.username) {
                    errorMessage = `Username: ${data.username[0]}`;
                } else if (data.email) {
                    errorMessage = `Email: ${data.email[0]}`;
                } else if (data.password) {
                    errorMessage = `Password: ${data.password[0]}`;
                } else if (data.non_field_errors) {
                    errorMessage = data.non_field_errors[0];
                } else if (data.error || data.detail) {
                    errorMessage = data.error || data.detail;
                }

                setError(errorMessage);
            }
        } catch (err) {
            console.error("Registration error:", err);
            setError('Network error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
            <Row className="w-100 justify-content-center">
                <Col md={7} lg={6} xl={5}>
                    <Card className="shadow-sm">
                        <Card.Body className="p-4 p-md-5">
                            <h2 className="text-center mb-4 text-primary fw-bold">Sign Up</h2>
                            
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}
                            
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="formUsername">
                                    <Form.Label className="text-muted fw-semibold">Username</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="Choose a username" 
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="py-2"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formEmail">
                                    <Form.Label className="text-muted fw-semibold">Email address</Form.Label>
                                    <Form.Control 
                                        type="email" 
                                        placeholder="Enter email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="py-2"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formPassword">
                                    <Form.Label className="text-muted fw-semibold">Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Create password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="py-2"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="formPasswordConfirm">
                                    <Form.Label className="text-muted fw-semibold">Confirm Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Confirm password" 
                                        value={passwordConfirm}
                                        onChange={(e) => setPasswordConfirm(e.target.value)}
                                        required
                                        className="py-2"
                                    />
                                </Form.Group>

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    className="w-100 py-2 fw-bold text-uppercase"
                                    disabled={loading}
                                >
                                    {loading ? 'Creating account...' : 'Create Account'}
                                </Button>

                                <div className="text-center mt-4 text-muted">
                                    Already have an account? <Link to="/login" className="text-decoration-none fw-bold">Sign in</Link>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Register;

import React, { useState } from 'react';
import { Typography, Form, Input, Button, Card, Checkbox, Divider, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, GoogleOutlined, FacebookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Make a real API call to the Django backend
      console.log('Sending registration data:', {
        username: values.username,
        email: values.email,
        password: values.password,
        confirm_password: values.confirmPassword,
        first_name: values.firstName,
        last_name: values.lastName,
        phone_number: values.phone
      });

      const response = await fetch('http://localhost:8000/api/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
          confirm_password: values.confirmPassword,
          first_name: values.firstName,
          last_name: values.lastName,
          phone_number: values.phone
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Registration error response:', errorData);

        // Format error messages from the API response
        let errorMessage = 'Registration failed';
        if (typeof errorData === 'object') {
          const messages = [];
          for (const [key, value] of Object.entries(errorData)) {
            if (Array.isArray(value)) {
              messages.push(`${key}: ${value.join(', ')}`);
            } else if (typeof value === 'string') {
              messages.push(`${key}: ${value}`);
            }
          }
          if (messages.length > 0) {
            errorMessage = messages.join('; ');
          }
        }

        throw new Error(errorMessage);
      }

      message.success('Registration successful! Please log in.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      message.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
      <Card className="auth-form" style={{ width: 500 }}>
        <Title level={2} style={{ textAlign: 'center' }}>Create an Account</Title>
        <Form
          name="register"
          initialValues={{ agree: false }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="firstName"
            rules={[{ required: true, message: 'Please enter your first name' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="First Name" size="large" />
          </Form.Item>

          <Form.Item
            name="lastName"
            rules={[{ required: true, message: 'Please enter your last name' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Last Name" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Please enter a username' },
              { min: 3, message: 'Username must be at least 3 characters' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
          </Form.Item>

          <Form.Item
            name="phone"
            rules={[{ required: true, message: 'Please enter your phone number' }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="Phone Number" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm Password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="agree"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('You must agree to the terms and conditions')),
              },
            ]}
          >
            <Checkbox>
              I agree to the <Link to="/terms">Terms of Service</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Register
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text>Already have an account? </Text>
            <Link to="/login">Login</Link>
          </div>

          <Divider>or register with</Divider>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Button
              icon={<GoogleOutlined />}
              size="large"
              onClick={() => message.info('Google registration not implemented in this demo')}
            >
              Google
            </Button>
            <Button
              icon={<FacebookOutlined />}
              size="large"
              onClick={() => message.info('Facebook registration not implemented in this demo')}
            >
              Facebook
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;
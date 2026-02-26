import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Mock the API
jest.mock('../services/api', () => ({
  authAPI: {
    login: jest.fn(),
  },
}));

const MockWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders login form correctly', () => {
    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );

    expect(screen.getByText('OVS')).toBeInTheDocument();
    expect(screen.getByText('Online Voting System')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  test('shows validation errors for empty fields', async () => {
    const { authAPI } = require('../services/api');
    authAPI.login.mockRejectedValue(new Error('Login failed'));

    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );

    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Email is required/)).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/)).toBeInTheDocument();
    });
  });

  test('validates password length', async () => {
    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 6 characters/)).toBeInTheDocument();
    });
  });

  test('shows loading state during login', async () => {
    const { authAPI } = require('../services/api');
    authAPI.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    expect(screen.getByText('Logging in...')).toBeInTheDocument();
  });

  test('successful login redirects and stores token', async () => {
    const { authAPI } = require('../services/api');
    authAPI.login.mockResolvedValue({
      data: {
        token: 'fake-token',
        redirect: '/admin/dashboard',
        role: 'admin'
      }
    });

    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('role', 'admin');
    });
  });

  test('toggles password visibility', () => {
    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );

    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: /👁|🙈/ });

    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  test('shows error message on login failure', async () => {
    const { authAPI } = require('../services/api');
    authAPI.login.mockRejectedValue({
      response: {
        data: {
          error: 'Invalid credentials'
        }
      }
    });

    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});

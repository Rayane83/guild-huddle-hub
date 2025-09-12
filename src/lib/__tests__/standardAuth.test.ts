import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStandardAuth } from '@/hooks/useStandardAuth';

// Mock Supabase client
const mockSupabase = {
  auth: {
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
    getSession: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn(),
  })),
  rpc: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('useStandardAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state', () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    
    const { result } = renderHook(() => useStandardAuth());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.userRole).toBe('user');
  });

  it('handles successful sign up', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: null });
    
    const { result } = renderHook(() => useStandardAuth());
    
    await act(async () => {
      const response = await result.current.signUp('test@example.com', 'password123');
      expect(response.error).toBeNull();
    });
    
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        emailRedirectTo: expect.any(String),
        data: {}
      }
    });
  });

  it('handles sign up with metadata', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: null });
    
    const { result } = renderHook(() => useStandardAuth());
    
    await act(async () => {
      await result.current.signUp('test@example.com', 'password123', {
        display_name: 'Test User',
        unique_id: '12345'
      });
    });
    
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        emailRedirectTo: expect.any(String),
        data: {
          display_name: 'Test User',
          unique_id: '12345'
        }
      }
    });
  });

  it('handles successful sign in', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    
    const { result } = renderHook(() => useStandardAuth());
    
    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'password123');
      expect(response.error).toBeNull();
    });
    
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('handles sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    
    const { result } = renderHook(() => useStandardAuth());
    
    await act(async () => {
      const response = await result.current.signOut();
      expect(response.error).toBeNull();
    });
    
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('handles role assignment for superadmin', async () => {
    const mockUserRoleState = { userRole: 'superadmin', user: { id: 'user1' } };
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useStandardAuth());
    
    // Simulate user being superadmin (this would normally be set by auth state)
    Object.assign(result.current, mockUserRoleState);

    await act(async () => {
      const response = await result.current.assignRole('user2', 'admin');
      expect(response.error).toBeNull();
    });
  });

  it('prevents role assignment for non-superadmin', async () => {
    const { result } = renderHook(() => useStandardAuth());
    
    await act(async () => {
      const response = await result.current.assignRole('user2', 'admin');
      expect(response.error).toBeTruthy();
      expect(response.error?.message).toContain('Only superadmins can assign roles');
    });
  });
});
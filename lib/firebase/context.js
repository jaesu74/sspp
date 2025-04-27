'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './config';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Auth 컨텍스트 생성
const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {}
});

// Auth 컨텍스트 제공자 컴포넌트
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 클라이언트 측에서만 실행
    if (typeof window === 'undefined' || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 사용자 정보를 로컬 스토리지에도 저장 (새로고침 시 유지)
        localStorage.setItem('sanctions_search_user_info', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
        }));

        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
        });
      } else {
        localStorage.removeItem('sanctions_search_user_info');
        setUser(null);
      }
      setLoading(false);
    });

    // 로컬 스토리지에서 사용자 정보 복원 (더 빠른 초기 렌더링)
    const storedUser = localStorage.getItem('sanctions_search_user_info');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('저장된 사용자 정보 파싱 오류:', e);
      }
    }

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (typeof window === 'undefined' || !auth) {
      throw new Error('클라이언트 측에서만 실행할 수 있습니다');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('로그인 오류:', error);
      throw new Error(error.message);
    }
  };

  const register = async (email, password) => {
    if (typeof window === 'undefined' || !auth) {
      throw new Error('클라이언트 측에서만 실행할 수 있습니다');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('회원가입 오류:', error);
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined' || !auth) {
      throw new Error('클라이언트 측에서만 실행할 수 있습니다');
    }

    try {
      await signOut(auth);
      localStorage.removeItem('sanctions_search_user_info');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Auth 컨텍스트 사용을 위한 훅
export const useAuth = () => {
  return useContext(AuthContext);
}; 
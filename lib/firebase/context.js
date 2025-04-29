'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, logoutUser } from './auth';
import { isFirebaseConfigValid } from './config';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

// Auth 컨텍스트 생성
const AuthContext = createContext({
  currentUser: null,
  loading: true,
  isAuthenticated: false,
  updateUserState: () => {},
  handleLogout: async () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {}
});

// Auth 컨텍스트 제공자 컴포넌트
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 사용자 상태 업데이트 함수
  const updateUserState = () => {
    try {
      const user = getCurrentUser();
      setCurrentUser(user);
      setLoading(false);
    } catch (error) {
      console.error('사용자 정보 가져오기 오류:', error);
      setCurrentUser(null);
      setLoading(false);
    }
  };

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 사용자 상태 확인
  useEffect(() => {
    if (typeof window === 'undefined') {
      // 서버 사이드에서는 처리하지 않음
      return;
    }

    if (!isFirebaseConfigValid) {
      console.log('Firebase 인증 없이 실행: 로컬 사용자 정보 사용');
      // 로컬 스토리지에서 사용자 정보 가져오기
      const storedUser = localStorage.getItem('localUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      setLoading(false);
      return;
    }

    // 클라이언트 사이드에서만 실행
    updateUserState();
    
    // 인증 상태 변경 리스너 구현 (Firebase 인증 사용시)
    // 여기에 필요한 경우 구현
    
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

  const register = async (email, password, displayName = '') => {
    if (typeof window === 'undefined' || !auth) {
      throw new Error('클라이언트 측에서만 실행할 수 있습니다');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 표시 이름 설정
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
        
        // 로컬 스토리지에 업데이트된 사용자 정보 저장
        localStorage.setItem('sanctions_search_user_info', JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName,
        }));
      }
      
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

  // 컨텍스트 값
  const value = {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    updateUserState,
    handleLogout,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Auth 컨텍스트 사용을 위한 훅
export const useAuth = () => {
  return useContext(AuthContext);
}; 
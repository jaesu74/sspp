import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser as firebaseDeleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './config';

// 로컬 스토리지 키
export const AUTH_TOKEN_KEY = 'sanctions_search_auth_token';
export const USER_INFO_KEY = 'sanctions_search_user_info';

// Firebase 초기화 상태
let firebaseInitialized = false;
let authInstance = null;

/**
 * Firebase 인증 오류 메시지를 사용자 친화적인 메시지로 변환
 * @param {Error} error - Firebase 오류 객체
 * @returns {string} - 사용자 친화적인 오류 메시지
 */
function formatAuthError(error) {
  if (!error || !error.code) {
    return '인증 중 오류가 발생했습니다.';
  }
  
  switch (error.code) {
    // 로그인 관련 오류
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/too-many-requests':
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
    case 'auth/user-disabled':
      return '해당 계정은 비활성화되었습니다. 관리자에게 문의하세요.';
      
    // 회원가입 관련 오류
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일 주소입니다.';
    case 'auth/invalid-email':
      return '유효하지 않은 이메일 형식입니다.';
    case 'auth/weak-password':
      return '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
      
    // 기타 오류
    case 'auth/network-request-failed':
      return '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.';
    case 'auth/popup-closed-by-user':
      return '인증 창이 닫혔습니다. 다시 시도해주세요.';
    case 'auth/cancelled-popup-request':
      return '이미 인증이 진행 중입니다.';
    case 'auth/operation-not-allowed':
      return '이 작업은 허용되지 않습니다. 관리자에게 문의하세요.';
      
    default:
      return `인증 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`;
  }
}

// Firebase 초기화 함수
const initializeFirebase = () => {
  // 이미 초기화되었거나 서버 사이드인 경우 처리
  if (firebaseInitialized || typeof window === 'undefined') {
    return { success: false, auth: authInstance };
  }
  
  try {
    // 기존 앱이 있는지 확인
    if (!getApps().length) {
      if (isFirebaseConfigValid) {
        const app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        firebaseInitialized = true;
        console.log('Firebase 인증 초기화 성공');
      } else {
        console.log('환경 변수가 없어 Firebase 인증 없이 실행합니다.');
        return { success: false, auth: null };
      }
    } else {
      const app = getApps()[0];
      authInstance = getAuth(app);
      firebaseInitialized = true;
    }
    
    return { success: true, auth: authInstance };
  } catch (error) {
    console.error('Firebase 초기화 오류:', error);
    return { success: false, auth: null };
  }
};

/**
 * 사용자 로그인 처리
 */
export const loginUser = async (email, password) => {
  if (!isFirebaseConfigValid) {
    console.log('Firebase 인증 없이 로그인 처리: 항상 성공');
    const localUser = { 
      email,
      uid: 'local-user-' + Date.now(),
      displayName: email.split('@')[0] 
    };
    
    // 로컬 사용자 정보 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('localUser', JSON.stringify(localUser));
    }
    
    return { 
      success: true, 
      user: localUser
    };
  }
  
  // Firebase 초기화 확인
  const { success, auth } = initializeFirebase();
  if (!success || !auth) {
    return { success: false, error: 'Firebase 초기화 실패' };
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 사용자 정보 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || ''
      }));
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('로그인 오류:', error.code, error.message);
    return { success: false, error: formatAuthError(error) };
  }
};

/**
 * 사용자 회원가입 처리
 */
export const signUpUser = async (email, password, displayName = '') => {
  if (!isFirebaseConfigValid) {
    console.log('Firebase 인증 없이 회원가입 처리: 항상 성공');
    const localUser = { 
      email,
      uid: 'local-user-' + Date.now(),
      displayName: displayName || email.split('@')[0] 
    };
    
    // 로컬 사용자 정보 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('localUser', JSON.stringify(localUser));
    }
    
    return { 
      success: true, 
      user: localUser 
    };
  }
  
  // Firebase 초기화 확인
  const { success, auth } = initializeFirebase();
  if (!success || !auth) {
    return { success: false, error: 'Firebase 초기화 실패' };
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 사용자 정보 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName || ''
      }));
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('회원가입 오류:', error.code, error.message);
    return { success: false, error: formatAuthError(error) };
  }
};

/**
 * 로그아웃 함수
 * @returns {Promise<Object>}
 */
export const logoutUser = async () => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    console.log('Firebase 인증 없이 로그아웃 처리');
    return { success: true };
  }
  
  try {
    await signOut(authInstance);
    
    // 로컬 스토리지에서 사용자 정보 삭제
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    
    return { success: true };
  } catch (error) {
    console.error('로그아웃 오류:', error);
    return { success: false, error: '로그아웃 중 오류가 발생했습니다.' };
  }
};

/**
 * 회원 탈퇴 함수: 현재 로그인한 사용자를 삭제
 * @returns {Promise<Object>} - 삭제 결과
 */
export const deleteUserAccount = async () => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    console.log('Firebase 인증 없이 사용자 삭제 처리');
    return { success: false, error: '인증 서비스를 사용할 수 없습니다.' };
  }

  try {
    const user = authInstance.currentUser;
    
    if (!user) {
      return { success: false, error: '로그인된 사용자가 없습니다.' };
    }
    
    await firebaseDeleteUser(user);
    
    // 로컬 스토리지에서 사용자 정보 삭제
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    
    return { success: true };
  } catch (error) {
    console.error('계정 삭제 오류:', error);
    
    let errorMessage = '계정 삭제 중 오류가 발생했습니다.';
    if (error.code === 'auth/requires-recent-login') {
      errorMessage = '보안을 위해 다시 로그인한 후 계정 삭제를 진행해주세요.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// 비밀번호 재설정 이메일 보내기
export const resetPassword = async (email) => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    return { success: false, error: '인증 서비스를 사용할 수 없습니다.' };
  }

  try {
    await sendPasswordResetEmail(authInstance, email);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 현재 인증된 사용자 가져오기
export const getCurrentUser = () => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    console.log('Firebase 인증 없이 사용자 확인');
    // 로컬 스토리지에서 유저 정보 확인 (개발용)
    const localUser = typeof window !== 'undefined' ? localStorage.getItem('localUser') : null;
    return localUser ? JSON.parse(localUser) : null;
  }
  
  return authInstance.currentUser;
};

// 사용자 프로필 업데이트
export const updateUserProfile = async (displayName, photoURL = null) => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    return { success: false, error: '인증 서비스를 사용할 수 없습니다.' };
  }

  try {
    const user = authInstance.currentUser;
    if (!user) return { success: false, error: '인증된 사용자가 없습니다.' };
    
    const updateData = { displayName };
    if (photoURL) updateData.photoURL = photoURL;
    
    await updateProfile(user, updateData);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 인증 토큰 가져오기
export const getAuthToken = async () => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    return null;
  }
  
  try {
    const user = authInstance.currentUser;
    
    if (!user) {
      return null;
    }
    
    return await user.getIdToken();
  } catch (error) {
    console.error('인증 토큰 가져오기 오류:', error);
    return null;
  }
};

// 인증 여부 확인
export const isAuthenticated = () => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    return false;
  }
  
  return !!authInstance.currentUser;
};

// 사용자 재인증 
export const reauthenticateUser = async (password) => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    console.warn('서버 사이드 렌더링 또는 Firebase가 초기화되지 않았습니다.');
    return { success: false, error: '인증 서비스를 사용할 수 없습니다.' };
  }

  try {
    const user = authInstance.currentUser;
    if (!user) {
      return { success: false, error: '인증된 사용자가 없습니다.' };
    }
    
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    
    return { success: true };
  } catch (error) {
    console.error('재인증 오류:', error.code, error.message);
    
    let errorMessage = '재인증에 실패했습니다.';
    if (error.code === 'auth/wrong-password') {
      errorMessage = '현재 비밀번호가 올바르지 않습니다.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = '너무 많은 시도로 인해 일시적으로 차단되었습니다. 나중에 다시 시도해주세요.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// 비밀번호 변경
export const changePassword = async (currentPassword, newPassword) => {
  if (!isFirebaseConfigValid || !firebaseInitialized || !authInstance) {
    console.warn('서버 사이드 렌더링 또는 Firebase가 초기화되지 않았습니다.');
    return { success: false, error: '인증 서비스를 사용할 수 없습니다.' };
  }

  try {
    // 먼저 재인증 진행
    const reauth = await reauthenticateUser(currentPassword);
    if (!reauth.success) {
      return reauth; // 재인증 실패 시 해당 오류 반환
    }
    
    const user = authInstance.currentUser;
    await updatePassword(user, newPassword);
    
    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
  } catch (error) {
    console.error('비밀번호 변경 오류:', error.code, error.message);
    
    let errorMessage = '비밀번호 변경에 실패했습니다.';
    if (error.code === 'auth/weak-password') {
      errorMessage = '새 비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// 함수 별칭 추가 (호환성 유지)
export const signIn = loginUser;
export const signUp = signUpUser;
export const logOut = logoutUser;

export { initializeFirebase }; 
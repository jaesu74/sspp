import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { loginWithEmailAndPassword, loginUser } from '../../lib/firebase/auth';
import { useAuth } from '../../lib/firebase/context';
import styles from '../../styles/Login.module.css';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteInfo, setShowDeleteInfo] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // URL 쿼리 파라미터 확인
  useEffect(() => {
    // 회원가입 성공 시 메시지 표시
    if (router.query.registered === 'true') {
      setError('회원가입이 완료되었습니다. 이메일과 비밀번호로 로그인해주세요.');
    }
  }, [router.query]);

  // 이미 로그인한 사용자 리디렉션
  useEffect(() => {
    if (!authLoading && user) {
      console.log('이미 로그인한 사용자를 메인 페이지로 리디렉션합니다.');
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/');
    } catch (error) {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
  };

  // 회원탈퇴 안내 토글
  const toggleDeleteInfo = () => {
    setShowDeleteInfo(!showDeleteInfo);
  };

  // 로그인 페이지 UI 렌더링
  return (
    <Container component="main" maxWidth="xs">
      <Head>
        <title>로그인 - 제재 정보 검색 시스템</title>
        <meta name="description" content="제재 정보 검색 시스템 로그인 페이지" />
      </Head>
      
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          로그인
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="이메일 주소"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="비밀번호"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            로그인
          </Button>
        </Box>
        
        <div className={styles.linkContainer}>
          <div className={styles.linkGroup}>
            <Link href="/auth/register" className={styles.link}>
              계정이 없으신가요? 회원가입
            </Link>
          </div>
          
          <div className={styles.linkGroup}>
            <button onClick={toggleDeleteInfo} className={styles.linkButton}>
              회원탈퇴를 원하시나요?
            </button>
            
            {showDeleteInfo && (
              <div className={styles.deleteInfo}>
                <p>회원탈퇴는 로그인 후 가능합니다.</p>
                <p>로그인 후 <span className={styles.highlight}>마이페이지 &gt; 회원탈퇴</span>를 이용해주세요.</p>
                <Link href="/auth/delete-account" className={styles.deleteLink}>
                  회원탈퇴 페이지로 이동
                </Link>
              </div>
            )}
          </div>
        </div>
      </Box>
    </Container>
  );
} 
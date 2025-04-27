import { useState } from 'react';
import { useRouter } from 'next/router';
import { deleteUserAccount, reauthenticateUser } from '../../lib/firebase/auth';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/Login.module.css';

const DeleteAccountPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDelete = async () => {
    try {
      // 먼저 현재 비밀번호로 재인증 진행
      const reauthResult = await reauthenticateUser(currentPassword);
      if (!reauthResult.success) {
        setError(reauthResult.error);
        return;
      }
      
      // 재인증 성공 후 회원 탈퇴 진행
      const result = await deleteUserAccount();
      if (result.success) {
        router.push('/auth/login');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>회원탈퇴 - 제재 정보 검색 시스템</title>
        <meta name="description" content="제재 정보 검색 시스템 회원탈퇴 페이지" />
      </Head>
      
      <div className={styles.loginBox}>
        <h1 className={styles.title}>제재 정보 검색 시스템</h1>
        <h2 className={styles.subtitle}>회원탈퇴</h2>
        
        <div className={styles.warning}>
          <p>⚠️ 주의: 계정을 삭제하면 되돌릴 수 없습니다.</p>
          <p>모든 개인 데이터가 영구적으로 삭제됩니다.</p>
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        
        <form className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">현재 비밀번호:</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="button" 
            className={styles.deleteButton}
            onClick={handleDelete}
          >
            회원 탈퇴
          </button>
          
          <div className={styles.linkContainer}>
            <Link href="/" className={styles.link}>
              취소하고 메인 페이지로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountPage; 
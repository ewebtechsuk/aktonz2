import Head from 'next/head';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

const AdminPage: NextPage = () => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (router.query.connected === '1') {
      setStatus('success');
    } else if (router.query.error) {
      setStatus('error');
    }
  }, [router.isReady, router.query]);

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'success':
        return 'Microsoft Graph connection updated successfully.';
      case 'error':
        return 'Unable to complete Microsoft Graph connection. Please try again.';
      default:
        return null;
    }
  }, [status]);

  const handleConnectClick = () => {
    setIsRedirecting(true);
    window.location.href = '/api/microsoft/connect';
  };

  return (
    <>
      <Head>
        <title>Admin — Microsoft Graph Email</title>
      </Head>
      <main
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Microsoft Graph Email</h1>
        <p style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Connect the aktonz.com shared mailbox to Microsoft Graph. You will be redirected to sign in
          with the authorised account (<strong>info@aktonz.com</strong>). Once completed, encrypted tokens are
          stored securely in Redis Cloud for sending transactional emails.

        </p>
        <button
          onClick={handleConnectClick}
          type="button"
          disabled={isRedirecting}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '0.5rem',
            border: 'none',
            color: '#fff',
            backgroundColor: isRedirecting ? '#94a3b8' : '#2563eb',
            cursor: isRedirecting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
          }}
        >
          {isRedirecting ? 'Redirecting…' : 'Connect to Microsoft'}
        </button>
        {statusMessage && (
          <p
            role="status"
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              backgroundColor: status === 'success' ? '#dcfce7' : '#fee2e2',
              color: status === 'success' ? '#166534' : '#991b1b',
            }}
          >
            {statusMessage}
          </p>
        )}
      </main>
    </>
  );
};

export default AdminPage;

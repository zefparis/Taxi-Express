import React from 'react';
import Layout from '../../components/layout/Layout';
import SimpleLogin from '../../components/auth/SimpleLogin';

const LoginPage = () => {
  return (
    <Layout>
      <div className="container py-5">
        <SimpleLogin />
      </div>
    </Layout>
  );
};

export default LoginPage;

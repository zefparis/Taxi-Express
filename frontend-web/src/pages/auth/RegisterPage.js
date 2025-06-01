import React from 'react';
import Layout from '../../components/layout/Layout';
import Register from '../../components/auth/Register';

const RegisterPage = () => {
  return (
    <Layout>
      <div className="container py-5">
        <Register />
      </div>
    </Layout>
  );
};

export default RegisterPage;

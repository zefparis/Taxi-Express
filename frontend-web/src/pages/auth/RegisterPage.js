import React from 'react';
import Layout from '../../components/layout/Layout';
import SimpleRegister from '../../components/auth/SimpleRegister';

const RegisterPage = () => {
  return (
    <Layout>
      <div className="container py-5">
        <SimpleRegister />
      </div>
    </Layout>
  );
};

export default RegisterPage;

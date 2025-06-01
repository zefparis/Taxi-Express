import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main className="container py-4">
        {children}
      </main>
      <Footer />
    </>
  );
};

export default Layout;

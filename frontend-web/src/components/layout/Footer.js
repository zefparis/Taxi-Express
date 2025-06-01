import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-dark text-white py-4 mt-5">
      <div className="container">
        <div className="row">
          <div className="col-md-4 mb-3">
            <h5>Taxi Express</h5>
            <p className="text-muted">
              Votre service de taxi de confiance, disponible 24/7 pour tous vos déplacements.
            </p>
          </div>
          <div className="col-md-2 mb-3">
            <h5>Liens utiles</h5>
            <ul className="list-unstyled">
              <li><Link to="/" className="text-muted">Accueil</Link></li>
              <li><Link to="/book" className="text-muted">Réserver</Link></li>
              <li><Link to="/services" className="text-muted">Services</Link></li>
              <li><Link to="/about" className="text-muted">À propos</Link></li>
            </ul>
          </div>
          <div className="col-md-3 mb-3">
            <h5>Assistance</h5>
            <ul className="list-unstyled">
              <li><Link to="/contact" className="text-muted">Contact</Link></li>
              <li><Link to="/faq" className="text-muted">FAQ</Link></li>
              <li><Link to="/terms" className="text-muted">Conditions d'utilisation</Link></li>
              <li><Link to="/privacy" className="text-muted">Politique de confidentialité</Link></li>
            </ul>
          </div>
          <div className="col-md-3 mb-3">
            <h5>Contactez-nous</h5>
            <ul className="list-unstyled text-muted">
              <li>Téléphone: +221 78 123 4567</li>
              <li>Email: contact@taxi-express.com</li>
              <li>Adresse: Dakar, Sénégal</li>
            </ul>
          </div>
        </div>
        <hr className="my-2" />
        <div className="row">
          <div className="col-md-6 text-center text-md-start">
            <p className="small text-muted mb-0">
              &copy; {currentYear} Taxi Express. Tous droits réservés.
            </p>
          </div>
          <div className="col-md-6 text-center text-md-end">
            <ul className="list-inline mb-0">
              <li className="list-inline-item">
                <a href="https://facebook.com" className="text-muted">
                  <i className="bi bi-facebook"></i>
                </a>
              </li>
              <li className="list-inline-item">
                <a href="https://twitter.com" className="text-muted">
                  <i className="bi bi-twitter"></i>
                </a>
              </li>
              <li className="list-inline-item">
                <a href="https://instagram.com" className="text-muted">
                  <i className="bi bi-instagram"></i>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

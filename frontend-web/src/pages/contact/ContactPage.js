import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulation d'envoi de formulaire
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <Layout>
      <div className="container py-5">
        <div className="row">
          <div className="col-12 text-center mb-5">
            <h1 className="mb-3">Contactez-nous</h1>
            <p className="lead">
              Nous sommes là pour répondre à toutes vos questions et vous aider dans vos déplacements.
            </p>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-5 mb-md-0">
            {submitted ? (
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex flex-column justify-content-center align-items-center text-center p-5">
                  <div className="mb-4">
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
                  </div>
                  <h2 className="h4 mb-3">Message envoyé avec succès !</h2>
                  <p className="mb-0">
                    Merci de nous avoir contactés. Notre équipe vous répondra dans les plus brefs délais, 
                    généralement sous 24 heures ouvrables.
                  </p>
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h2 className="h4 mb-4">Envoyez-nous un message</h2>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label">Nom complet</label>
                      <input
                        type="text"
                        className="form-control"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="subject" className="form-label">Sujet</label>
                      <select
                        className="form-select"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Sélectionnez un sujet</option>
                        <option value="reservation">Réservation</option>
                        <option value="information">Demande d'information</option>
                        <option value="partnership">Partenariat</option>
                        <option value="driver">Devenir chauffeur</option>
                        <option value="complaint">Réclamation</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label htmlFor="message" className="form-label">Message</label>
                      <textarea
                        className="form-control"
                        id="message"
                        name="message"
                        rows="5"
                        value={formData.message}
                        onChange={handleChange}
                        required
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Envoi en cours...
                        </>
                      ) : 'Envoyer le message'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
          
          <div className="col-md-6">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h2 className="h4 mb-4">Nos coordonnées</h2>
                <ul className="list-unstyled">
                  <li className="mb-3">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="bi bi-geo-alt-fill text-primary fs-5"></i>
                      </div>
                      <div>
                        <strong>Adresse</strong>
                        <p className="mb-0">123 Avenue de la République, Dakar, Sénégal</p>
                      </div>
                    </div>
                  </li>
                  <li className="mb-3">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="bi bi-telephone-fill text-primary fs-5"></i>
                      </div>
                      <div>
                        <strong>Téléphone</strong>
                        <p className="mb-0">+221 78 123 45 67</p>
                      </div>
                    </div>
                  </li>
                  <li className="mb-3">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="bi bi-envelope-fill text-primary fs-5"></i>
                      </div>
                      <div>
                        <strong>Email</strong>
                        <p className="mb-0">contact@taxi-express.com</p>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="bi bi-clock-fill text-primary fs-5"></i>
                      </div>
                      <div>
                        <strong>Heures d'ouverture</strong>
                        <p className="mb-0">Lundi - Vendredi: 8h - 18h<br />Samedi: 9h - 15h</p>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h2 className="h4 mb-4">Suivez-nous</h2>
                <div className="d-flex gap-3">
                  <a href="#!" className="btn btn-outline-primary rounded-circle">
                    <i className="bi bi-facebook"></i>
                  </a>
                  <a href="#!" className="btn btn-outline-primary rounded-circle">
                    <i className="bi bi-twitter"></i>
                  </a>
                  <a href="#!" className="btn btn-outline-primary rounded-circle">
                    <i className="bi bi-instagram"></i>
                  </a>
                  <a href="#!" className="btn btn-outline-primary rounded-circle">
                    <i className="bi bi-linkedin"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="row mt-5">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d123488.93606767903!2d-17.544260341796875!3d14.716708499999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xec172f5b3c5bb71%3A0xb17c17d92d5db21f!2sDakar%2C%20Senegal!5e0!3m2!1sen!2sus!4v1623159488797!5m2!1sen!2sus" 
                  width="100%" 
                  height="450" 
                  style={{ border: 0 }} 
                  allowFullScreen="" 
                  loading="lazy"
                  title="Carte de notre emplacement"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;

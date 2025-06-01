import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero bg-dark text-white py-5 mb-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="display-4 fw-bold mb-4">Votre taxi en quelques clics</h1>
              <p className="lead mb-4">
                Taxi Express vous offre un service de transport rapide, fiable et sécurisé partout au Sénégal.
              </p>
              <div className="d-flex gap-3">
                <Link to="/book" className="btn btn-primary btn-lg">
                  Réserver maintenant
                </Link>
                <Link to="/services" className="btn btn-outline-light btn-lg">
                  Nos services
                </Link>
              </div>
            </div>
            <div className="col-md-6 d-none d-md-block">
              <div className="text-center">
                <img 
                  src="https://placehold.co/600x400?text=Taxi+Express" 
                  alt="Taxi Express" 
                  className="img-fluid rounded shadow"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features py-5 mb-5">
        <div className="container">
          <h2 className="text-center mb-5">Pourquoi choisir Taxi Express ?</h2>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="bi bi-clock fs-1 text-primary"></i>
                  </div>
                  <h3 className="card-title h5">Rapide et ponctuel</h3>
                  <p className="card-text">
                    Notre service garantit des arrivées rapides et ponctuelles pour tous vos déplacements.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="bi bi-shield-check fs-1 text-primary"></i>
                  </div>
                  <h3 className="card-title h5">Sécurité garantie</h3>
                  <p className="card-text">
                    Tous nos chauffeurs sont vérifiés et nos véhicules régulièrement contrôlés pour votre sécurité.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center p-4">
                  <div className="feature-icon mb-3">
                    <i className="bi bi-cash-coin fs-1 text-primary"></i>
                  </div>
                  <h3 className="card-title h5">Prix transparent</h3>
                  <p className="card-text">
                    Connaissez le prix de votre course à l'avance, sans surprises ni frais cachés.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works py-5 mb-5 bg-light">
        <div className="container">
          <h2 className="text-center mb-5">Comment ça marche</h2>
          <div className="row g-4">
            <div className="col-md-3">
              <div className="text-center">
                <div className="step-number mb-3">1</div>
                <h3 className="h5">Inscrivez-vous</h3>
                <p>Créez votre compte en quelques secondes</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <div className="step-number mb-3">2</div>
                <h3 className="h5">Réservez un taxi</h3>
                <p>Indiquez votre destination et choisissez votre véhicule</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <div className="step-number mb-3">3</div>
                <h3 className="h5">Suivez votre chauffeur</h3>
                <p>Visualisez l'arrivée de votre chauffeur en temps réel</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <div className="step-number mb-3">4</div>
                <h3 className="h5">Profitez de votre trajet</h3>
                <p>Payez facilement et notez votre expérience</p>
              </div>
            </div>
          </div>
          <div className="text-center mt-4">
            <Link to="/register" className="btn btn-primary">
              Commencer maintenant
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials py-5 mb-5">
        <div className="container">
          <h2 className="text-center mb-5">Ce que disent nos clients</h2>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="mb-3">
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                  </div>
                  <p className="card-text mb-3">
                    "Service impeccable ! Le chauffeur était à l'heure et très professionnel. Je recommande vivement Taxi Express pour tous vos déplacements."
                  </p>
                  <div className="d-flex align-items-center">
                    <div className="avatar me-3">
                      <img
                        src="https://placehold.co/50x50?text=A"
                        alt="Avatar"
                        className="rounded-circle"
                      />
                    </div>
                    <div>
                      <h5 className="mb-0">Aminata D.</h5>
                      <small className="text-muted">Dakar</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="mb-3">
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-half text-warning"></i>
                  </div>
                  <p className="card-text mb-3">
                    "Application facile à utiliser et prix très compétitifs. J'utilise Taxi Express pour tous mes déplacements professionnels."
                  </p>
                  <div className="d-flex align-items-center">
                    <div className="avatar me-3">
                      <img
                        src="https://placehold.co/50x50?text=M"
                        alt="Avatar"
                        className="rounded-circle"
                      />
                    </div>
                    <div>
                      <h5 className="mb-0">Moussa T.</h5>
                      <small className="text-muted">Saint-Louis</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="mb-3">
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                    <i className="bi bi-star-fill text-warning"></i>
                  </div>
                  <p className="card-text mb-3">
                    "Je me sens en sécurité avec Taxi Express, surtout pour mes déplacements tardifs. Les chauffeurs sont courtois et les véhicules propres."
                  </p>
                  <div className="d-flex align-items-center">
                    <div className="avatar me-3">
                      <img
                        src="https://placehold.co/50x50?text=F"
                        alt="Avatar"
                        className="rounded-circle"
                      />
                    </div>
                    <div>
                      <h5 className="mb-0">Fatou S.</h5>
                      <small className="text-muted">Thiès</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta bg-primary text-white py-5">
        <div className="container text-center">
          <h2 className="mb-4">Prêt à essayer Taxi Express ?</h2>
          <p className="lead mb-4">
            Rejoignez des milliers de clients satisfaits et simplifiez vos déplacements dès aujourd'hui.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/register" className="btn btn-light btn-lg">
              S'inscrire gratuitement
            </Link>
            <Link to="/contact" className="btn btn-outline-light btn-lg">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

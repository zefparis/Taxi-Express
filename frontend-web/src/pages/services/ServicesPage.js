import React from 'react';
import Layout from '../../components/layout/Layout';
import { Link } from 'react-router-dom';

const ServicesPage = () => {
  return (
    <Layout>
      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <h1 className="mb-4">Nos Services</h1>
            <p className="lead">
              Découvrez notre gamme complète de services de transport adaptés à tous vos besoins.
            </p>
          </div>
        </div>

        <div className="row mt-4">
          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title h5">
                  <i className="bi bi-car-front me-2"></i>
                  Transport Standard
                </h3>
                <p className="card-text">
                  Notre service de base pour vos déplacements quotidiens. Confortable, ponctuel et économique.
                </p>
                <ul className="list-unstyled">
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Disponible 24/7</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Tarifs compétitifs</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Chauffeurs expérimentés</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title h5">
                  <i className="bi bi-star me-2"></i>
                  Premium
                </h3>
                <p className="card-text">
                  Un service haut de gamme pour vos déplacements professionnels ou occasions spéciales.
                </p>
                <ul className="list-unstyled">
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Véhicules luxueux</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Chauffeurs en costume</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Eau et rafraîchissements offerts</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title h5">
                  <i className="bi bi-people me-2"></i>
                  Transport de Groupe
                </h3>
                <p className="card-text">
                  Solution idéale pour les groupes, événements ou sorties en famille.
                </p>
                <ul className="list-unstyled">
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Véhicules spacieux</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Jusqu'à 8 passagers</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Tarifs de groupe avantageux</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title h5">
                  <i className="bi bi-briefcase me-2"></i>
                  Service Aéroport
                </h3>
                <p className="card-text">
                  Transport fiable vers et depuis l'aéroport, avec suivi des vols.
                </p>
                <ul className="list-unstyled">
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Suivi des retards de vol</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Assistance bagages</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Attente gratuite (30 min)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title h5">
                  <i className="bi bi-calendar-event me-2"></i>
                  Réservation à l'Avance
                </h3>
                <p className="card-text">
                  Planifiez vos déplacements à l'avance pour une tranquillité d'esprit totale.
                </p>
                <ul className="list-unstyled">
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Réservation jusqu'à 3 mois à l'avance</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Rappels automatiques</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Modification gratuite</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title h5">
                  <i className="bi bi-clock me-2"></i>
                  Service Horaire
                </h3>
                <p className="card-text">
                  Louez un taxi avec chauffeur à l'heure pour vos rendez-vous multiples.
                </p>
                <ul className="list-unstyled">
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Facturation à l'heure</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Attente illimitée</li>
                  <li><i className="bi bi-check-circle-fill text-success me-2"></i>Destinations multiples</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="row mt-5">
          <div className="col-12 text-center">
            <h2 className="h4 mb-4">Vous avez des besoins spécifiques ?</h2>
            <p>Contactez-nous pour discuter de solutions personnalisées adaptées à vos exigences.</p>
            <Link to="/contact" className="btn btn-primary">
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ServicesPage;

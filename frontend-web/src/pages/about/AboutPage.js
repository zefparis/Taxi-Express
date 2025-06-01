import React from 'react';
import Layout from '../../components/layout/Layout';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <Layout>
      <div className="container py-5">
        <div className="row">
          <div className="col-12 col-lg-8 mx-auto text-center mb-5">
            <h1 className="mb-4">À propos de Taxi Express</h1>
            <p className="lead">
              Votre partenaire de confiance pour tous vos déplacements depuis 2018.
            </p>
          </div>
        </div>

        <div className="row align-items-center mb-5">
          <div className="col-md-6 mb-4 mb-md-0">
            <img 
              src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
              alt="Notre équipe de chauffeurs professionnels" 
              className="img-fluid rounded shadow"
            />
          </div>
          <div className="col-md-6">
            <h2 className="h3 mb-3">Notre Histoire</h2>
            <p>
              Fondée en 2018 à Dakar, Taxi Express est née d'une vision simple : révolutionner le transport urbain en Afrique de l'Ouest en offrant un service fiable, sécurisé et accessible à tous.
            </p>
            <p>
              Ce qui a commencé avec une flotte de seulement 5 véhicules s'est rapidement développé pour devenir l'un des services de taxi les plus fiables de la région, avec plus de 200 chauffeurs partenaires aujourd'hui.
            </p>
          </div>
        </div>

        <div className="row align-items-center mb-5 flex-md-row-reverse">
          <div className="col-md-6 mb-4 mb-md-0">
            <img 
              src="https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
              alt="Notre application mobile" 
              className="img-fluid rounded shadow"
            />
          </div>
          <div className="col-md-6">
            <h2 className="h3 mb-3">Notre Mission</h2>
            <p>
              Chez Taxi Express, notre mission est de fournir un service de transport sûr, fiable et abordable qui améliore la mobilité urbaine pour tous.
            </p>
            <p>
              Nous nous engageons à créer des opportunités économiques pour nos chauffeurs partenaires tout en offrant une expérience client exceptionnelle à chaque trajet.
            </p>
          </div>
        </div>

        <div className="row mb-5">
          <div className="col-12">
            <h2 className="h3 text-center mb-4">Nos Valeurs</h2>
            <div className="row">
              <div className="col-md-4 mb-4">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center">
                    <div className="mb-3">
                      <i className="bi bi-shield-check text-primary" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                    <h3 className="h5">Sécurité</h3>
                    <p>La sécurité de nos clients et chauffeurs est notre priorité absolue. Tous nos véhicules sont régulièrement inspectés et nos chauffeurs soigneusement sélectionnés.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center">
                    <div className="mb-3">
                      <i className="bi bi-stars text-primary" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                    <h3 className="h5">Excellence</h3>
                    <p>Nous visons l'excellence dans chaque aspect de notre service, de la propreté de nos véhicules à la courtoisie de nos chauffeurs.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center">
                    <div className="mb-3">
                      <i className="bi bi-people text-primary" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                    <h3 className="h5">Communauté</h3>
                    <p>Nous croyons en la création d'une communauté forte entre nos clients, nos chauffeurs et notre équipe, unis par des valeurs communes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-5">
          <div className="col-12">
            <h2 className="h3 text-center mb-4">Notre Équipe Dirigeante</h2>
            <div className="row">
              <div className="col-md-4 mb-4">
                <div className="card border-0 shadow-sm">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                    className="card-img-top" 
                    alt="CEO"
                  />
                  <div className="card-body text-center">
                    <h3 className="h5">Amadou Diallo</h3>
                    <p className="text-muted">Fondateur & CEO</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card border-0 shadow-sm">
                  <img 
                    src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                    className="card-img-top" 
                    alt="COO"
                  />
                  <div className="card-body text-center">
                    <h3 className="h5">Fatou Sow</h3>
                    <p className="text-muted">Directrice des Opérations</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card border-0 shadow-sm">
                  <img 
                    src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                    className="card-img-top" 
                    alt="CTO"
                  />
                  <div className="card-body text-center">
                    <h3 className="h5">Omar Ndiaye</h3>
                    <p className="text-muted">Directeur Technique</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12 text-center">
            <h2 className="h3 mb-4">Rejoignez l'Aventure Taxi Express</h2>
            <p className="mb-4">
              Vous êtes chauffeur et souhaitez rejoindre notre plateforme ? Ou vous avez des questions sur nos services ?
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link to="/contact" className="btn btn-primary">
                Contactez-nous
              </Link>
              <Link to="/register" className="btn btn-outline-primary">
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;

import React, { useState } from 'react';
import { Card, Row, Col, Button, Badge, Form, Alert } from 'react-bootstrap';
import { StarFill, Star, CheckCircleFill, Receipt } from 'react-bootstrap-icons';

/**
 * Composant affichant le résumé d'une course terminée avec notation du chauffeur
 * @param {Object} trip - Informations sur la course
 * @param {Object} driver - Informations sur le chauffeur
 * @param {Object} payment - Informations sur le paiement
 * @param {Function} onRateDriver - Fonction appelée lors de la notation du chauffeur
 * @param {Function} onClose - Fonction appelée pour fermer le résumé
 */
const TripSummary = ({ trip, driver, payment, onRateDriver, onClose }) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  // Formatage du prix en Francs Congolais (CDF)
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Formatage de la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-CD', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Gestion de la soumission de la notation
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Appel au callback avec les données de notation
    onRateDriver({
      tripId: trip.id,
      driverId: driver.id,
      rating,
      feedback
    });
    
    // Marquer comme soumis
    setSubmitted(true);
  };
  
  // Rendu des étoiles pour la notation
  const renderRatingStars = () => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span 
          key={i} 
          onClick={() => setRating(i)}
          style={{ cursor: 'pointer', fontSize: '1.5rem' }}
        >
          {i <= rating ? (
            <StarFill className="text-warning" />
          ) : (
            <Star className="text-warning" />
          )}
        </span>
      );
    }
    
    return (
      <div className="d-flex justify-content-center gap-2 mb-3">
        {stars}
      </div>
    );
  };
  
  return (
    <Card className="mb-4">
      <Card.Header className="bg-success text-white">
        <div className="d-flex align-items-center">
          <CheckCircleFill className="me-2" />
          <h5 className="mb-0">Course terminée</h5>
        </div>
      </Card.Header>
      
      <Card.Body>
        <Row className="mb-4">
          <Col md={6}>
            <h6>Détails de la course</h6>
            <p className="mb-1">
              <strong>Date:</strong> {formatDate(trip.timestamp || new Date().toISOString())}
            </p>
            <p className="mb-1">
              <strong>Départ:</strong> {trip.pickup.address}
            </p>
            <p className="mb-1">
              <strong>Arrivée:</strong> {trip.dropoff.address}
            </p>
            <p className="mb-1">
              <strong>Distance:</strong> {trip.distance} km
            </p>
            <p className="mb-3">
              <strong>Durée:</strong> {trip.duration} min
            </p>
            
            <h6>Chauffeur</h6>
            <p className="mb-1">
              <strong>Nom:</strong> {driver.name}
            </p>
            <p className="mb-1">
              <strong>Véhicule:</strong> {driver.vehicle.model} ({driver.vehicle.color})
            </p>
            <p className="mb-1">
              <strong>Plaque:</strong> {driver.vehicle.plate}
            </p>
          </Col>
          
          <Col md={6}>
            <h6>Paiement</h6>
            <p className="mb-1">
              <strong>Méthode:</strong> {
                payment.method === 'mobile' 
                  ? `Paiement mobile (${payment.provider === 'orange' 
                      ? 'Orange Money' 
                      : payment.provider === 'airtel' 
                        ? 'Airtel Money' 
                        : 'Africell Money'})`
                  : payment.method === 'card' 
                    ? 'Carte bancaire'
                    : 'Espèces'
              }
            </p>
            <p className="mb-1">
              <strong>Statut:</strong> {
                payment.status === 'completed' 
                  ? <Badge bg="success">Payé</Badge>
                  : payment.status === 'pending'
                    ? <Badge bg="warning">En attente</Badge>
                    : <Badge bg="danger">Échec</Badge>
              }
            </p>
            <p className="mb-1">
              <strong>Référence:</strong> {payment.reference || 'N/A'}
            </p>
            <p className="mb-1">
              <strong>Tarif de base:</strong> {formatPrice(trip.baseFare)}
            </p>
            <p className="mb-1">
              <strong>Tarif distance:</strong> {formatPrice(trip.distanceFare)}
            </p>
            <p className="mb-1">
              <strong>Tarif durée:</strong> {formatPrice(trip.timeFare)}
            </p>
            <p className="mb-3">
              <Badge bg="secondary">Commission de service (20%): {formatPrice(trip.commission)}</Badge>
            </p>
            
            <div className="total-price">
              Total: {formatPrice(trip.price)}
            </div>
            
            <div className="text-center mt-3">
              <Button 
                variant="outline-primary" 
                size="sm"
                className="d-flex align-items-center mx-auto"
              >
                <Receipt className="me-2" /> Télécharger le reçu
              </Button>
            </div>
          </Col>
        </Row>
        
        {submitted ? (
          <Alert variant="success" className="text-center">
            <CheckCircleFill className="me-2" />
            Merci pour votre évaluation! Votre avis nous aide à améliorer notre service.
          </Alert>
        ) : (
          <Form onSubmit={handleSubmit}>
            <h5 className="text-center mb-3">Comment s'est passée votre course?</h5>
            
            {renderRatingStars()}
            
            <Form.Group className="mb-4">
              <Form.Label>Commentaire (optionnel)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Partagez votre expérience avec ce chauffeur..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </Form.Group>
            
            <div className="d-flex justify-content-between">
              <Button variant="outline-secondary" onClick={onClose}>
                Fermer
              </Button>
              
              <Button variant="primary" type="submit">
                Soumettre l'évaluation
              </Button>
            </div>
          </Form>
        )}
      </Card.Body>
    </Card>
  );
};

export default TripSummary;

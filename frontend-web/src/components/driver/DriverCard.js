import React from 'react';
import { Card, Row, Col, Button, Badge } from 'react-bootstrap';
import { Star, StarFill, Telephone, Chat, CurrencyDollar } from 'react-bootstrap-icons';

/**
 * Composant affichant les détails d'un chauffeur
 * @param {Object} driver - Informations du chauffeur
 * @param {Function} onChatClick - Fonction appelée lors du clic sur le bouton de chat
 * @param {Function} onCallClick - Fonction appelée lors du clic sur le bouton d'appel
 * @param {Function} onConfirmClick - Fonction appelée lors du clic sur le bouton de confirmation
 * @param {boolean} isSelected - Indique si le chauffeur est sélectionné
 */
const DriverCard = ({ driver, onChatClick, onCallClick, onConfirmClick, isSelected }) => {
  // Fonction pour afficher les étoiles de notation
  const renderRating = (rating) => {
    const ratingValue = parseFloat(rating);
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      if (i <= ratingValue) {
        stars.push(<StarFill key={i} className="text-warning" />);
      } else if (i - 0.5 <= ratingValue) {
        stars.push(<StarFill key={i} className="text-warning" />);
      } else {
        stars.push(<Star key={i} className="text-warning" />);
      }
    }
    
    return (
      <span className="d-inline-flex align-items-center">
        {stars} <span className="ms-1">({rating})</span>
      </span>
    );
  };
  
  return (
    <Card className={`mb-3 driver-card ${isSelected ? 'border-primary' : ''}`}>
      <Card.Body>
        <Row>
          <Col xs={12} md={8}>
            <h5 className="mb-1">{driver.name}</h5>
            <div className="mb-2">{renderRating(driver.rating)}</div>
            
            <div className="mb-2">
              <strong>Véhicule:</strong> {driver.vehicle.model} ({driver.vehicle.color})
            </div>
            
            <div className="mb-2">
              <strong>Plaque:</strong> {driver.vehicle.plate}
            </div>
            
            <div className="mb-2">
              <Badge bg="info" className="me-2">
                {driver.distance} km
              </Badge>
              <Badge bg="secondary">
                {driver.estimatedArrival} min
              </Badge>
            </div>
          </Col>
          
          <Col xs={12} md={4} className="d-flex flex-column justify-content-between">
            <div className="d-grid gap-2 mt-3 mt-md-0">
              <Button 
                variant="outline-primary" 
                size="sm" 
                className="d-flex align-items-center justify-content-center"
                onClick={() => onChatClick(driver)}
              >
                <Chat className="me-2" /> Chat
              </Button>
              
              <Button 
                variant="outline-success" 
                size="sm" 
                className="d-flex align-items-center justify-content-center"
                onClick={() => onCallClick(driver)}
              >
                <Telephone className="me-2" /> Appeler
              </Button>
              
              <Button 
                variant={isSelected ? "success" : "primary"} 
                size="sm" 
                className="d-flex align-items-center justify-content-center"
                onClick={() => onConfirmClick(driver)}
              >
                <CurrencyDollar className="me-2" /> 
                {isSelected ? "Sélectionné" : "Sélectionner"}
              </Button>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default DriverCard;

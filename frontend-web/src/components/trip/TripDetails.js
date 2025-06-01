import React, { useState } from 'react';
import { Card, Row, Col, Button, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { Cash, CreditCard, Phone, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import PaymentService from '../../services/payment.service';

/**
 * Composant affichant les détails d'une course et les options de paiement
 * @param {Object} trip - Informations sur la course
 * @param {Object} driver - Informations sur le chauffeur
 * @param {Function} onPaymentComplete - Fonction appelée lorsque le paiement est terminé
 * @param {Function} onCancel - Fonction appelée lors de l'annulation
 */
const TripDetails = ({ trip, driver, onPaymentComplete, onCancel }) => {
  const [paymentMethod, setPaymentMethod] = useState('mobile');
  const [mobileProvider, setMobileProvider] = useState('orange');
  const [mobileNumber, setMobileNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  
  // Formatage du prix en Francs Congolais (CDF)
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Gestion du paiement
  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let paymentData = {
        tripId: trip.id,
        amount: trip.price,
        driverId: driver.id,
        method: paymentMethod
      };
      
      // Ajouter les détails spécifiques au mode de paiement
      if (paymentMethod === 'mobile') {
        paymentData.provider = mobileProvider;
        paymentData.phoneNumber = mobileNumber;
      } else if (paymentMethod === 'card') {
        paymentData.cardNumber = cardNumber;
        paymentData.cardExpiry = cardExpiry;
        paymentData.cardCvc = cardCvc;
      }
      
      // Appel au service de paiement
      const result = await PaymentService.processPayment(paymentData);
      setPaymentStatus(result);
      
      // Si le paiement est réussi, appeler le callback
      if (result.status === 'completed') {
        setTimeout(() => {
          onPaymentComplete(result);
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors du paiement');
    } finally {
      setLoading(false);
    }
  };
  
  // Affichage du statut du paiement
  const renderPaymentStatus = () => {
    if (!paymentStatus) return null;
    
    if (paymentStatus.status === 'completed') {
      return (
        <Alert variant="success" className="mt-3">
          <CheckCircleFill className="me-2" />
          Paiement réussi! Votre reçu a été envoyé par SMS et email.
        </Alert>
      );
    } else if (paymentStatus.status === 'pending') {
      return (
        <Alert variant="warning" className="mt-3">
          <Spinner animation="border" size="sm" className="me-2" />
          Paiement en cours de traitement. Veuillez patienter...
        </Alert>
      );
    } else {
      return (
        <Alert variant="danger" className="mt-3">
          <XCircleFill className="me-2" />
          Échec du paiement: {paymentStatus.message}
        </Alert>
      );
    }
  };
  
  return (
    <Card className="mb-4">
      <Card.Header as="h5">Détails de la course</Card.Header>
      <Card.Body>
        <Row className="mb-4">
          <Col md={6}>
            <h6>Itinéraire</h6>
            <p className="mb-1">
              <strong>Départ:</strong> {trip.pickup.address}
            </p>
            <p className="mb-3">
              <strong>Arrivée:</strong> {trip.dropoff.address}
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
            <h6>Tarification</h6>
            <p className="mb-1">
              <strong>Distance:</strong> {trip.distance} km
            </p>
            <p className="mb-1">
              <strong>Durée estimée:</strong> {trip.duration} min
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
          </Col>
        </Row>
        
        {paymentStatus?.status === 'completed' ? (
          <div className="text-center">
            <Button variant="primary" onClick={() => onPaymentComplete(paymentStatus)}>
              Continuer
            </Button>
          </div>
        ) : (
          <Form onSubmit={handlePayment}>
            <h5 className="mb-3">Méthode de paiement</h5>
            
            <div className="mb-3">
              <Form.Check
                type="radio"
                id="payment-mobile"
                name="paymentMethod"
                label={<><Phone className="me-2" /> Paiement mobile</>}
                checked={paymentMethod === 'mobile'}
                onChange={() => setPaymentMethod('mobile')}
                className="mb-2"
              />
              
              <Form.Check
                type="radio"
                id="payment-card"
                name="paymentMethod"
                label={<><CreditCard className="me-2" /> Carte bancaire</>}
                checked={paymentMethod === 'card'}
                onChange={() => setPaymentMethod('card')}
                className="mb-2"
              />
              
              <Form.Check
                type="radio"
                id="payment-cash"
                name="paymentMethod"
                label={<><Cash className="me-2" /> Espèces (paiement au chauffeur)</>}
                checked={paymentMethod === 'cash'}
                onChange={() => setPaymentMethod('cash')}
              />
            </div>
            
            {paymentMethod === 'mobile' && (
              <div className="mb-3">
                <Form.Group className="mb-3">
                  <Form.Label>Opérateur mobile</Form.Label>
                  <Form.Select
                    value={mobileProvider}
                    onChange={(e) => setMobileProvider(e.target.value)}
                    required
                  >
                    <option value="orange">Orange Money</option>
                    <option value="airtel">Airtel Money</option>
                    <option value="africell">Africell Money</option>
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Numéro de téléphone</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="Ex: 0991234567"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Entrez le numéro associé à votre compte {mobileProvider === 'orange' ? 'Orange Money' : mobileProvider === 'airtel' ? 'Airtel Money' : 'Africell Money'}
                  </Form.Text>
                </Form.Group>
              </div>
            )}
            
            {paymentMethod === 'card' && (
              <div className="mb-3">
                <Form.Group className="mb-3">
                  <Form.Label>Numéro de carte</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date d'expiration</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>CVC</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            )}
            
            {renderPaymentStatus()}
            
            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}
            
            <div className="d-flex justify-content-between mt-4">
              <Button variant="outline-secondary" onClick={onCancel} disabled={loading}>
                Annuler
              </Button>
              
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading || paymentStatus?.status === 'completed'}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Traitement...
                  </>
                ) : (
                  `Payer ${formatPrice(trip.price)}`
                )}
              </Button>
            </div>
          </Form>
        )}
      </Card.Body>
    </Card>
  );
};

export default TripDetails;

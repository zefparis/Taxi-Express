import React from 'react';
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import DriverCard from './DriverCard';

/**
 * Composant affichant une liste de chauffeurs disponibles
 * @param {Array} drivers - Liste des chauffeurs
 * @param {boolean} loading - Indique si les données sont en cours de chargement
 * @param {string} error - Message d'erreur éventuel
 * @param {Function} onDriverSelect - Fonction appelée lors de la sélection d'un chauffeur
 * @param {Function} onDriverChat - Fonction appelée lors du clic sur le bouton de chat
 * @param {Function} onDriverCall - Fonction appelée lors du clic sur le bouton d'appel
 * @param {string} selectedDriverId - ID du chauffeur sélectionné
 */
const DriverList = ({ 
  drivers, 
  loading, 
  error, 
  onDriverSelect, 
  onDriverChat, 
  onDriverCall,
  selectedDriverId 
}) => {
  // Afficher un indicateur de chargement
  if (loading) {
    return (
      <Container className="text-center py-4">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
        <p className="mt-2">Recherche de chauffeurs disponibles...</p>
      </Container>
    );
  }
  
  // Afficher un message d'erreur
  if (error) {
    return (
      <Alert variant="danger" className="my-3">
        <Alert.Heading>Erreur</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }
  
  // Afficher un message si aucun chauffeur n'est disponible
  if (!drivers || drivers.length === 0) {
    return (
      <Alert variant="info" className="my-3">
        <Alert.Heading>Aucun chauffeur disponible</Alert.Heading>
        <p>Désolé, aucun chauffeur n'est disponible dans votre zone pour le moment. Veuillez réessayer plus tard ou élargir votre zone de recherche.</p>
      </Alert>
    );
  }
  
  // Afficher la liste des chauffeurs
  return (
    <Container className="py-3">
      <h4 className="mb-3">Chauffeurs disponibles ({drivers.length})</h4>
      <Row>
        <Col xs={12}>
          {drivers.map(driver => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onChatClick={onDriverChat}
              onCallClick={onDriverCall}
              onConfirmClick={onDriverSelect}
              isSelected={driver.id === selectedDriverId}
            />
          ))}
        </Col>
      </Row>
    </Container>
  );
};

export default DriverList;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';

const SettingsPage = () => {
  const { currentUser, updateUserProfile, changePassword, error, loading, clearErrors } = useAuth();
  const navigate = useNavigate();
  
  // États pour les différentes sections
  const [activeTab, setActiveTab] = useState('profile');
  
  // États pour le profil
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });
  
  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // États pour les préférences de paiement
  const [paymentPreferences, setPaymentPreferences] = useState({
    defaultPaymentMethod: 'card',
    savePaymentInfo: true
  });
  
  // États pour les notifications
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    marketingEmails: false
  });
  
  // Messages de succès
  const [successMessage, setSuccessMessage] = useState('');
  
  // Erreurs locales
  const [localErrors, setLocalErrors] = useState({});
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Initialiser les données du profil avec les informations de l'utilisateur actuel
    if (currentUser) {
      setProfile({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || ''
      });
    }
  }, [currentUser, navigate]);
  
  // Gestionnaires d'événements pour les changements de champs
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePaymentPreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaymentPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({ ...prev, [name]: checked }));
  };
  
  // Soumission du formulaire de profil
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLocalErrors({});
    setSuccessMessage('');
    
    try {
      await updateUserProfile(profile);
      setSuccessMessage('Profil mis à jour avec succès !');
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du profil :', err);
    }
  };
  
  // Soumission du formulaire de changement de mot de passe
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLocalErrors({});
    setSuccessMessage('');
    
    // Validation locale
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setLocalErrors({ confirmPassword: 'Les mots de passe ne correspondent pas' });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setLocalErrors({ newPassword: 'Le mot de passe doit contenir au moins 8 caractères' });
      return;
    }
    
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccessMessage('Mot de passe modifié avec succès !');
      
      // Réinitialiser le formulaire
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Erreur lors du changement de mot de passe :', err);
    }
  };
  
  // Soumission du formulaire de préférences de paiement
  const handlePaymentPreferencesSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('Préférences de paiement enregistrées !');
    
    // Effacer le message de succès après 3 secondes
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Soumission du formulaire de notifications
  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('Préférences de notifications enregistrées !');
    
    // Effacer le message de succès après 3 secondes
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  return (
    <Layout>
      <div className="container py-5">
        <h2 className="mb-4">Paramètres</h2>
        
        {/* Messages d'erreur globaux */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        {/* Message de succès */}
        {successMessage && (
          <div className="alert alert-success" role="alert">
            {successMessage}
          </div>
        )}
        
        <div className="row">
          <div className="col-md-3 mb-4">
            <div className="list-group">
              <button 
                className={`list-group-item list-group-item-action ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <i className="bi bi-person me-2"></i> Profil
              </button>
              <button 
                className={`list-group-item list-group-item-action ${activeTab === 'password' ? 'active' : ''}`}
                onClick={() => setActiveTab('password')}
              >
                <i className="bi bi-key me-2"></i> Mot de passe
              </button>
              <button 
                className={`list-group-item list-group-item-action ${activeTab === 'payment' ? 'active' : ''}`}
                onClick={() => setActiveTab('payment')}
              >
                <i className="bi bi-credit-card me-2"></i> Paiement
              </button>
              <button 
                className={`list-group-item list-group-item-action ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                <i className="bi bi-bell me-2"></i> Notifications
              </button>
            </div>
          </div>
          
          <div className="col-md-9">
            <div className="card">
              <div className="card-body">
                {/* Onglet Profil */}
                {activeTab === 'profile' && (
                  <>
                    <h4 className="card-title mb-4">Informations personnelles</h4>
                    <form onSubmit={handleProfileSubmit}>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label htmlFor="firstName" className="form-label">Prénom</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            id="firstName" 
                            name="firstName"
                            value={profile.firstName}
                            onChange={handleProfileChange}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="lastName" className="form-label">Nom</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            id="lastName" 
                            name="lastName"
                            value={profile.lastName}
                            onChange={handleProfileChange}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          id="email" 
                          name="email"
                          value={profile.email}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="phone" className="form-label">Téléphone</label>
                        <input 
                          type="tel" 
                          className="form-control" 
                          id="phone" 
                          name="phone"
                          value={profile.phone}
                          onChange={handleProfileChange}
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="address" className="form-label">Adresse</label>
                        <textarea 
                          className="form-control" 
                          id="address" 
                          name="address"
                          value={profile.address}
                          onChange={handleProfileChange}
                          rows="3"
                        ></textarea>
                      </div>
                      
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Enregistrement...
                          </>
                        ) : 'Enregistrer les modifications'}
                      </button>
                    </form>
                  </>
                )}
                
                {/* Onglet Mot de passe */}
                {activeTab === 'password' && (
                  <>
                    <h4 className="card-title mb-4">Changer votre mot de passe</h4>
                    <form onSubmit={handlePasswordSubmit}>
                      <div className="mb-3">
                        <label htmlFor="currentPassword" className="form-label">Mot de passe actuel</label>
                        <input 
                          type="password" 
                          className="form-control" 
                          id="currentPassword" 
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="newPassword" className="form-label">Nouveau mot de passe</label>
                        <input 
                          type="password" 
                          className={`form-control ${localErrors.newPassword ? 'is-invalid' : ''}`}
                          id="newPassword" 
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                        {localErrors.newPassword && (
                          <div className="invalid-feedback">
                            {localErrors.newPassword}
                          </div>
                        )}
                        <div className="form-text">
                          Le mot de passe doit contenir au moins 8 caractères.
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="confirmPassword" className="form-label">Confirmer le nouveau mot de passe</label>
                        <input 
                          type="password" 
                          className={`form-control ${localErrors.confirmPassword ? 'is-invalid' : ''}`}
                          id="confirmPassword" 
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                        {localErrors.confirmPassword && (
                          <div className="invalid-feedback">
                            {localErrors.confirmPassword}
                          </div>
                        )}
                      </div>
                      
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Modification...
                          </>
                        ) : 'Modifier le mot de passe'}
                      </button>
                    </form>
                  </>
                )}
                
                {/* Onglet Paiement */}
                {activeTab === 'payment' && (
                  <>
                    <h4 className="card-title mb-4">Préférences de paiement</h4>
                    <form onSubmit={handlePaymentPreferencesSubmit}>
                      <div className="mb-3">
                        <label className="form-label">Méthode de paiement par défaut</label>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="radio" 
                            name="defaultPaymentMethod" 
                            id="paymentMethodCard" 
                            value="card"
                            checked={paymentPreferences.defaultPaymentMethod === 'card'}
                            onChange={handlePaymentPreferenceChange}
                          />
                          <label className="form-check-label" htmlFor="paymentMethodCard">
                            <i className="bi bi-credit-card me-2"></i> Carte bancaire
                          </label>
                        </div>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="radio" 
                            name="defaultPaymentMethod" 
                            id="paymentMethodCash" 
                            value="cash"
                            checked={paymentPreferences.defaultPaymentMethod === 'cash'}
                            onChange={handlePaymentPreferenceChange}
                          />
                          <label className="form-check-label" htmlFor="paymentMethodCash">
                            <i className="bi bi-cash me-2"></i> Espèces
                          </label>
                        </div>
                      </div>
                      
                      <div className="mb-3 form-check">
                        <input 
                          type="checkbox" 
                          className="form-check-input" 
                          id="savePaymentInfo" 
                          name="savePaymentInfo"
                          checked={paymentPreferences.savePaymentInfo}
                          onChange={handlePaymentPreferenceChange}
                        />
                        <label className="form-check-label" htmlFor="savePaymentInfo">
                          Enregistrer mes informations de paiement pour les futures courses
                        </label>
                      </div>
                      
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                      >
                        Enregistrer les préférences
                      </button>
                    </form>
                  </>
                )}
                
                {/* Onglet Notifications */}
                {activeTab === 'notifications' && (
                  <>
                    <h4 className="card-title mb-4">Préférences de notifications</h4>
                    <form onSubmit={handleNotificationsSubmit}>
                      <div className="mb-3 form-check">
                        <input 
                          type="checkbox" 
                          className="form-check-input" 
                          id="emailNotifications" 
                          name="emailNotifications"
                          checked={notifications.emailNotifications}
                          onChange={handleNotificationChange}
                        />
                        <label className="form-check-label" htmlFor="emailNotifications">
                          Recevoir des notifications par email
                        </label>
                      </div>
                      
                      <div className="mb-3 form-check">
                        <input 
                          type="checkbox" 
                          className="form-check-input" 
                          id="smsNotifications" 
                          name="smsNotifications"
                          checked={notifications.smsNotifications}
                          onChange={handleNotificationChange}
                        />
                        <label className="form-check-label" htmlFor="smsNotifications">
                          Recevoir des notifications par SMS
                        </label>
                      </div>
                      
                      <div className="mb-3 form-check">
                        <input 
                          type="checkbox" 
                          className="form-check-input" 
                          id="pushNotifications" 
                          name="pushNotifications"
                          checked={notifications.pushNotifications}
                          onChange={handleNotificationChange}
                        />
                        <label className="form-check-label" htmlFor="pushNotifications">
                          Recevoir des notifications push
                        </label>
                      </div>
                      
                      <div className="mb-3 form-check">
                        <input 
                          type="checkbox" 
                          className="form-check-input" 
                          id="marketingEmails" 
                          name="marketingEmails"
                          checked={notifications.marketingEmails}
                          onChange={handleNotificationChange}
                        />
                        <label className="form-check-label" htmlFor="marketingEmails">
                          Recevoir des offres promotionnelles et actualités
                        </label>
                      </div>
                      
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                      >
                        Enregistrer les préférences
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;

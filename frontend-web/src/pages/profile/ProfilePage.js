import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import AuthService from '../../services/auth.service';

const ProfilePage = () => {
  const { currentUser, setError } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bookingHistory, setBookingHistory] = useState([]);
  
  // Définir fetchBookingHistory avec useCallback pour éviter les re-rendus inutiles
  const fetchBookingHistory = React.useCallback(async () => {
    try {
      const response = await AuthService.getUserBookings();
      setBookingHistory(response.data);
    } catch (err) {
      setError('Impossible de charger l\'historique des réservations');
      console.error(err);
    }
  }, [setError]);
  
  useEffect(() => {
    if (currentUser) {
      setFormData({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Charger l'historique des réservations
      fetchBookingHistory();
    } else {
      navigate('/login');
    }
  }, [currentUser, navigate, fetchBookingHistory]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const toggleEdit = () => {
    setIsEditing(!isEditing);
    setMessage('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validation du mot de passe si changement demandé
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }
      
      if (!formData.currentPassword) {
        setMessage('Veuillez entrer votre mot de passe actuel');
        setLoading(false);
        return;
      }
    }
    
    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address
      };
      
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      await AuthService.updateProfile(updateData);
      setMessage('Profil mis à jour avec succès');
      setIsEditing(false);
      setLoading(false);
      
      // Réinitialiser les champs de mot de passe
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setMessage(
        err.response?.data?.message || 
        'Erreur lors de la mise à jour du profil'
      );
      setLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="container py-5">
        <div className="row">
          <div className="col-lg-4">
            <div className="card mb-4">
              <div className="card-body text-center">
                <img 
                  src={currentUser?.profilePicture || "https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-chat/ava3.webp"} 
                  alt="avatar"
                  className="rounded-circle img-fluid" 
                  style={{ width: '150px' }} 
                />
                <h5 className="my-3">{`${formData.firstName} ${formData.lastName}`}</h5>
                <p className="text-muted mb-1">Client Taxi Express</p>
                <p className="text-muted mb-4">{formData.address}</p>
                <div className="d-flex justify-content-center mb-2">
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={toggleEdit}
                  >
                    {isEditing ? 'Annuler' : 'Modifier le profil'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-8">
            <div className="card mb-4">
              <div className="card-body">
                {message && (
                  <div className={`alert ${message.includes('succès') ? 'alert-success' : 'alert-danger'}`}>
                    {message}
                  </div>
                )}
                
                {isEditing ? (
                  <form onSubmit={handleSubmit}>
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <label htmlFor="firstName" className="col-form-label">Prénom</label>
                      </div>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <label htmlFor="lastName" className="col-form-label">Nom</label>
                      </div>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <label htmlFor="email" className="col-form-label">Email</label>
                      </div>
                      <div className="col-sm-9">
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          disabled
                        />
                        <small className="text-muted">L'email ne peut pas être modifié</small>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <label htmlFor="phone" className="col-form-label">Téléphone</label>
                      </div>
                      <div className="col-sm-9">
                        <input
                          type="tel"
                          className="form-control"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <label htmlFor="address" className="col-form-label">Adresse</label>
                      </div>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <hr />
                    <h5>Changer le mot de passe</h5>
                    <small className="text-muted">Laissez vide si vous ne souhaitez pas changer de mot de passe</small>
                    
                    <div className="row mb-3 mt-3">
                      <div className="col-sm-3">
                        <label htmlFor="currentPassword" className="col-form-label">Mot de passe actuel</label>
                      </div>
                      <div className="col-sm-9">
                        <input
                          type="password"
                          className="form-control"
                          id="currentPassword"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <label htmlFor="newPassword" className="col-form-label">Nouveau mot de passe</label>
                      </div>
                      <div className="col-sm-9">
                        <input
                          type="password"
                          className="form-control"
                          id="newPassword"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <label htmlFor="confirmPassword" className="col-form-label">Confirmer le mot de passe</label>
                      </div>
                      <div className="col-sm-9">
                        <input
                          type="password"
                          className="form-control"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-sm-9 offset-sm-3">
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="row">
                      <div className="col-sm-3">
                        <p className="mb-0">Nom complet</p>
                      </div>
                      <div className="col-sm-9">
                        <p className="text-muted mb-0">{`${formData.firstName} ${formData.lastName}`}</p>
                      </div>
                    </div>
                    <hr />
                    <div className="row">
                      <div className="col-sm-3">
                        <p className="mb-0">Email</p>
                      </div>
                      <div className="col-sm-9">
                        <p className="text-muted mb-0">{formData.email}</p>
                      </div>
                    </div>
                    <hr />
                    <div className="row">
                      <div className="col-sm-3">
                        <p className="mb-0">Téléphone</p>
                      </div>
                      <div className="col-sm-9">
                        <p className="text-muted mb-0">{formData.phone}</p>
                      </div>
                    </div>
                    <hr />
                    <div className="row">
                      <div className="col-sm-3">
                        <p className="mb-0">Adresse</p>
                      </div>
                      <div className="col-sm-9">
                        <p className="text-muted mb-0">{formData.address}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Historique des réservations</h5>
                {bookingHistory.length === 0 ? (
                  <p className="text-muted">Aucune réservation trouvée.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>De</th>
                          <th>À</th>
                          <th>Statut</th>
                          <th>Prix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookingHistory.map((booking) => (
                          <tr key={booking.id}>
                            <td>{new Date(booking.createdAt).toLocaleDateString()}</td>
                            <td>{booking.pickupLocation}</td>
                            <td>{booking.dropoffLocation}</td>
                            <td>
                              <span className={`badge ${
                                booking.status === 'completed' ? 'bg-success' :
                                booking.status === 'cancelled' ? 'bg-danger' :
                                booking.status === 'in_progress' ? 'bg-primary' :
                                'bg-warning'
                              }`}>
                                {booking.status === 'completed' ? 'Terminé' :
                                 booking.status === 'cancelled' ? 'Annulé' :
                                 booking.status === 'in_progress' ? 'En cours' :
                                 'En attente'}
                              </span>
                            </td>
                            <td>{booking.price} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;

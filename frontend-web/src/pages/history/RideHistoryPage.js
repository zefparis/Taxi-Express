import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBooking } from '../../contexts/BookingContext';
import Layout from '../../components/layout/Layout';

const RideHistoryPage = () => {
  const { currentUser } = useAuth();
  const { getUserBookingHistory, rateTrip, loading, error } = useBooking();
  const navigate = useNavigate();
  
  const [bookings, setBookings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  
  // Définir fetchBookingHistory avec useCallback pour éviter les re-rendus inutiles
  const fetchBookingHistory = React.useCallback(async () => {
    try {
      const response = await getUserBookingHistory(currentPage, 10);
      setBookings(response.data.bookings);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'historique :', err);
    }
  }, [getUserBookingHistory, currentPage]);
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    fetchBookingHistory();
  }, [currentUser, fetchBookingHistory, navigate]);
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const openRatingModal = (booking) => {
    setSelectedBooking(booking);
    setRating(booking.rating || 0);
    setComment(booking.comment || '');
    setRatingSubmitted(false);
  };
  
  const closeRatingModal = () => {
    setSelectedBooking(null);
    setRating(0);
    setComment('');
  };
  
  const handleRatingChange = (value) => {
    setRating(value);
  };
  
  const handleCommentChange = (e) => {
    setComment(e.target.value);
  };
  
  const submitRating = async () => {
    if (!selectedBooking) return;
    
    try {
      await rateTrip(selectedBooking.id, rating, comment);
      setRatingSubmitted(true);
      
      // Mettre à jour la liste des réservations
      fetchBookingHistory();
      
      // Fermer le modal après 2 secondes
      setTimeout(() => {
        closeRatingModal();
      }, 2000);
    } catch (err) {
      console.error('Erreur lors de la soumission de la note :', err);
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge bg-success">Terminé</span>;
      case 'cancelled':
        return <span className="badge bg-danger">Annulé</span>;
      case 'in_progress':
        return <span className="badge bg-primary">En cours</span>;
      default:
        return <span className="badge bg-warning">En attente</span>;
    }
  };
  
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };
  
  return (
    <Layout>
      <div className="container py-5">
        <h2 className="mb-4">Historique de vos courses</h2>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="d-flex justify-content-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
          </div>
        ) : (
          <>
            {bookings.length === 0 ? (
              <div className="alert alert-info">
                Vous n'avez pas encore effectué de course. <a href="/book" className="alert-link">Réserver un taxi</a>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Date</th>
                        <th>De</th>
                        <th>À</th>
                        <th>Prix</th>
                        <th>Statut</th>
                        <th>Chauffeur</th>
                        <th>Note</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>{formatDate(booking.createdAt)}</td>
                          <td>{booking.pickupLocation}</td>
                          <td>{booking.dropoffLocation}</td>
                          <td>{booking.price} €</td>
                          <td>{getStatusBadge(booking.status)}</td>
                          <td>{booking.driver?.name || 'Non assigné'}</td>
                          <td>
                            {booking.rating ? (
                              <div>
                                {[...Array(5)].map((_, i) => (
                                  <i 
                                    key={i} 
                                    className={`bi ${i < booking.rating ? 'bi-star-fill' : 'bi-star'} text-warning`}
                                  ></i>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted">Non noté</span>
                            )}
                          </td>
                          <td>
                            {booking.status === 'completed' && !booking.rating && (
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openRatingModal(booking)}
                              >
                                Noter
                              </button>
                            )}
                            {booking.status === 'pending' && (
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                // onClick={() => handleCancelBooking(booking.id)}
                              >
                                Annuler
                              </button>
                            )}
                            <button 
                              className="btn btn-sm btn-outline-secondary ms-1"
                              // onClick={() => handleViewDetails(booking.id)}
                            >
                              Détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <nav aria-label="Page navigation">
                    <ul className="pagination justify-content-center">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Précédent
                        </button>
                      </li>
                      
                      {[...Array(totalPages)].map((_, i) => (
                        <li 
                          key={i} 
                          className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}
                        >
                          <button 
                            className="page-link" 
                            onClick={() => handlePageChange(i + 1)}
                          >
                            {i + 1}
                          </button>
                        </li>
                      ))}
                      
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Suivant
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </>
            )}
          </>
        )}
        
        {/* Modal de notation */}
        {selectedBooking && (
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Noter votre course</h5>
                  <button type="button" className="btn-close" onClick={closeRatingModal}></button>
                </div>
                <div className="modal-body">
                  {ratingSubmitted ? (
                    <div className="alert alert-success">
                      Merci pour votre évaluation !
                    </div>
                  ) : (
                    <>
                      <p>De {selectedBooking.pickupLocation} à {selectedBooking.dropoffLocation}</p>
                      <p>Date: {formatDate(selectedBooking.createdAt)}</p>
                      
                      <div className="mb-3">
                        <label className="form-label">Votre note :</label>
                        <div className="rating-stars">
                          {[...Array(5)].map((_, i) => (
                            <i 
                              key={i} 
                              className={`bi ${i < rating ? 'bi-star-fill' : 'bi-star'} text-warning fs-4 me-1`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleRatingChange(i + 1)}
                            ></i>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="comment" className="form-label">Commentaire :</label>
                        <textarea 
                          className="form-control" 
                          id="comment" 
                          rows="3"
                          value={comment}
                          onChange={handleCommentChange}
                        ></textarea>
                      </div>
                    </>
                  )}
                </div>
                {!ratingSubmitted && (
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeRatingModal}>Annuler</button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={submitRating}
                      disabled={rating === 0}
                    >
                      Soumettre
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RideHistoryPage;

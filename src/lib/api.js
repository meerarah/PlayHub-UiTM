let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (baseUrl && !baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
  baseUrl = baseUrl.replace(/\/$/, '') + '/api';
}
const API_BASE_URL = baseUrl;


export const api = {
  // Courts
  getCourts: async () => {
    const res = await fetch(`${API_BASE_URL}/courts`);
    if (!res.ok) throw new Error('Failed to fetch courts');
    return res.json();
  },
  createCourt: async (courtData) => {
    const res = await fetch(`${API_BASE_URL}/courts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courtData)
    });
    if (!res.ok) throw new Error('Failed to create court');
    return res.json();
  },
  updateCourt: async (id, courtData) => {
    const res = await fetch(`${API_BASE_URL}/courts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courtData)
    });
    if (!res.ok) throw new Error('Failed to update court');
    return res.json();
  },
  deleteCourt: async (id) => {
    const res = await fetch(`${API_BASE_URL}/courts/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete court');
    return res.json();
  },

  // Feedbacks
  getFeedbacks: async () => {
    const res = await fetch(`${API_BASE_URL}/feedbacks`);
    if (!res.ok) throw new Error('Failed to fetch feedbacks');
    return res.json();
  },
  createFeedback: async (feedbackData) => {
    const res = await fetch(`${API_BASE_URL}/feedbacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    if (!res.ok) throw new Error('Failed to create feedback');
    return res.json();
  },

  // Users
  getUser: async (id) => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },
  syncUser: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) throw new Error('Failed to sync user');
    return res.json();
  },
  getStudentBadges: async (id) => {
    const res = await fetch(`${API_BASE_URL}/users/${id}/badges`);
    if (!res.ok) throw new Error('Failed to fetch student badges');
    return res.json();
  },

  // Tournaments
  getTournaments: async (status) => {
    const url = status 
      ? `${API_BASE_URL}/tournaments?status=${encodeURIComponent(status)}`
      : `${API_BASE_URL}/tournaments`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch tournaments');
    return res.json();
  },
  getTournamentById: async (id) => {
    const res = await fetch(`${API_BASE_URL}/tournaments/${id}`);
    if (!res.ok) throw new Error('Failed to fetch tournament details');
    return res.json();
  },
  createTournament: async (tournamentData) => {
    const res = await fetch(`${API_BASE_URL}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tournamentData)
    });
    if (!res.ok) throw new Error('Failed to create tournament');
    return res.json();
  },
  updateTournament: async (id, tournamentData) => {
    const res = await fetch(`${API_BASE_URL}/tournaments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tournamentData)
    });
    if (!res.ok) throw new Error('Failed to update tournament');
    return res.json();
  },
  deleteTournament: async (id) => {
    const res = await fetch(`${API_BASE_URL}/tournaments/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete tournament');
    return res.json();
  },

  // Tournament Registrations
  getTournamentRegistrations: async (id) => {
    const res = await fetch(`${API_BASE_URL}/tournaments/${id}/registrations`);
    if (!res.ok) throw new Error('Failed to fetch tournament registrations');
    return res.json();
  },
  registerTournament: async (id, registrationData) => {
    const res = await fetch(`${API_BASE_URL}/tournaments/${id}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to submit registration');
    }
    return res.json();
  },
  updateTournamentRegistrationStatus: async (regId, status) => {
    const res = await fetch(`${API_BASE_URL}/tournaments/registrations/${regId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update registration status');
    return res.json();
  },
  getStudentTournamentRegistrations: async (studentId, matrixId) => {
    const url = matrixId 
      ? `${API_BASE_URL}/tournaments/student/${studentId}/registrations?matrixId=${encodeURIComponent(matrixId)}`
      : `${API_BASE_URL}/tournaments/student/${studentId}/registrations`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch student registrations');
    return res.json();
  },

  // Tournament Requests
  getTournamentRequests: async () => {
    const res = await fetch(`${API_BASE_URL}/tournaments/requests/all`);
    if (!res.ok) throw new Error('Failed to fetch tournament requests');
    return res.json();
  },
  updateTournamentRequestStatus: async (requestId, status) => {
    const res = await fetch(`${API_BASE_URL}/tournaments/requests/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update tournament request status');
    return res.json();
  },
  createTournamentRequest: async (requestData) => {
    const res = await fetch(`${API_BASE_URL}/tournaments/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    if (!res.ok) throw new Error('Failed to create tournament request');
    return res.json();
  },

  // Photo Diaries
  getPhotos: async (studentId) => {
    const res = await fetch(`${API_BASE_URL}/photos?studentID=${encodeURIComponent(studentId)}`);
    if (!res.ok) throw new Error('Failed to fetch photos');
    return res.json();
  },
  createPhoto: async (photoData) => {
    const res = await fetch(`${API_BASE_URL}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photoData)
    });
    if (!res.ok) throw new Error('Failed to post photo');
    return res.json();
  },
  deletePhoto: async (id) => {
    const res = await fetch(`${API_BASE_URL}/photos/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete photo');
    return res.json();
  },

  // Notifications
  getNotifications: async (userId) => {
    const res = await fetch(`${API_BASE_URL}/notifications?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },
  createNotification: async (notificationData) => {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationData)
    });
    if (!res.ok) throw new Error('Failed to create notification');
    return res.json();
  },
  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },
  markAllNotificationsRead: async (userId) => {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to mark all notifications as read');
    return res.json();
  },
  deleteNotification: async (id) => {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete notification');
    return res.json();
  },

  // Sports Events & Bookings
  getEvents: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.courtID) queryParams.append('courtID', params.courtID);
    if (params.date) queryParams.append('date', params.date);
    if (params.status) queryParams.append('status', params.status);
    
    const res = await fetch(`${API_BASE_URL}/events?${queryParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE_URL}/events/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
    return res.json();
  },
  createEvent: async (eventData) => {
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Failed to create event/booking');
    return res.json();
  },
  updateBookingStatus: async (id, status) => {
    const res = await fetch(`${API_BASE_URL}/events/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update booking status');
    return res.json();
  },
  deleteEvent: async (id) => {
    const res = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete event');
    return res.json();
  },

  // Event Registrations
  getEventParticipants: async (id) => {
    const res = await fetch(`${API_BASE_URL}/events/${id}/participants`);
    if (!res.ok) throw new Error('Failed to fetch event participants');
    return res.json();
  },
  joinEvent: async (eventId, joinData) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(joinData)
    });
    if (!res.ok) throw new Error('Failed to join event');
    return res.json();
  },
  updateParticipantStatus: async (regId, status, studentId) => {
    const res = await fetch(`${API_BASE_URL}/events/registrations/${regId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, studentId })
    });
    if (!res.ok) throw new Error('Failed to update participant status');
    return res.json();
  },
  getStudentEventRegistrations: async (studentId) => {
    const res = await fetch(`${API_BASE_URL}/events/student/${studentId}/registrations`);
    if (!res.ok) throw new Error('Failed to fetch student registrations');
    return res.json();
  }
};

export default api;

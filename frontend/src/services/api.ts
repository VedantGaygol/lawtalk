import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export default api;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lawtalk_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const loginUser = (data: { email: string; password: string }) =>
  api.post("/api/auth/login", data).then((r) => r.data);

export const registerUser = (data: { name: string; email: string; password: string; role: string }) =>
  api.post("/api/auth/register", data).then((r) => r.data);

export const getMe = () =>
  api.get("/api/auth/me").then((r) => r.data);

// Lawyers
export const getLawyers = (params?: Record<string, any>) =>
  api.get("/api/lawyers", { params }).then((r) => r.data);

export const getLawyerById = (id: number) =>
  api.get(`/api/lawyers/${id}`).then((r) => r.data);

export const getLawyerReviews = (id: number) =>
  api.get(`/api/lawyers/${id}/reviews`).then((r) => r.data);

// Cases
export const getCases = () =>
  api.get("/api/cases").then((r) => r.data);

export const getCaseById = (id: number) =>
  api.get(`/api/cases/${id}`).then((r) => r.data);

export const getCaseAnalysis = (id: number) =>
  api.get(`/api/cases/${id}/analysis`).then((r) => r.data);

export const getCaseRecommendations = (id: number) =>
  api.get(`/api/cases/${id}/recommendations`).then((r) => r.data);

export const createCase = (data: Record<string, any>) =>
  api.post("/api/cases", data).then((r) => r.data);

// Requests
export const getRequests = () =>
  api.get("/api/requests").then((r) => r.data);

export const getRequestById = (id: number) =>
  api.get(`/api/requests/${id}`).then((r) => r.data);

export const respondToRequest = (requestId: number, data: { status: string }) =>
  api.put(`/api/requests/${requestId}/respond`, data).then((r) => r.data);

export const createRequest = (data: { lawyerId: number; caseId: number; message?: string }) =>
  api.post("/api/requests", data).then((r) => r.data);

// Conversations & Messages
export const getConversations = () =>
  api.get("/api/messages/conversations").then((r) => r.data);

export const getMessages = (conversationId: string) =>
  api.get(`/api/messages/${conversationId}`).then((r) => r.data);

export const sendMessage = (conversationId: string, data: { content: string; messageType: string }) =>
  api.post(`/api/messages/${conversationId}`, data).then((r) => r.data);

// User profile
export const updateUserProfile = (data: { name?: string; phone?: string; location?: string; profileImage?: string }) =>
  api.put("/api/users/profile", data).then((r) => r.data);

export const getCaseAssignedLawyer = (caseId: number) =>
  api.get(`/api/cases/${caseId}/lawyer`).then((r) => r.data);

export const createConversation = (otherUserId: number) => {
  // conversation ID is deterministic: sorted user IDs joined by _
  // We need current user id — caller must pass both
  return Promise.resolve(null); // placeholder, see usage
};

export const getConversationId = (myUserId: number, otherUserId: number) =>
  [myUserId, otherUserId].sort((a, b) => a - b).join("_");
export const getLawyerProfile = () =>
  api.get("/api/lawyers/profile").then((r) => r.data);

export const updateLawyerProfile = (data: { specialization?: string; experience?: number; location?: string; pricing?: number; bio?: string; profileImage?: string }) =>
  api.put("/api/lawyers/profile", data).then((r) => r.data);

export const uploadLicense = (licenseUrl: string) =>
  api.post("/api/lawyers/upload-license", { licenseUrl }).then((r) => r.data);

export const getLawyerReviewsById = (id: number) =>
  api.get(`/api/lawyers/${id}/reviews`).then((r) => r.data);

// Notifications
export const getNotifications = () =>
  api.get("/api/notifications").then((r) => r.data);

export const markNotificationRead = (id: number) =>
  api.put(`/api/notifications/${id}/read`).then((r) => r.data);

export const getSolvePending = (caseId: number) =>
  api.get(`/api/cases/${caseId}/solve-pending`).then((r) => r.data);

export const markCaseSolved = (caseId: number) =>
  api.put(`/api/cases/${caseId}/mark-solved`).then((r) => r.data);

export const confirmCaseSolved = (caseId: number, confirmed: boolean) =>
  api.put(`/api/cases/${caseId}/confirm-solved`, { confirmed }).then((r) => r.data);

export const createReview = (data: { lawyerId: number; caseId: number; rating: number; comment?: string }) =>
  api.post("/api/reviews", data).then((r) => r.data);

// Admin
export const adminGetLawyers = () =>
  api.get("/api/admin/lawyers").then((r) => r.data);

export const adminApproveLawyer = (id: number, data: { status: string; reason?: string }) =>
  api.put(`/api/admin/lawyers/${id}/approve`, data).then((r) => r.data);

export const adminGetStats = () =>
  api.get("/api/admin/stats").then((r) => r.data);

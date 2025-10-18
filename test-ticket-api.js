/**
 * Test script for Support Ticket API endpoints
 * Run with: node test-ticket-api.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test credentials (you'll need to update these with real credentials)
const TEST_USER = {
  email: 'testuser@example.com',
  password: 'password123',
};

const TEST_SUPER_ADMIN = {
  email: 'superadmin@example.com',
  password: 'admin123',
};

let userToken = '';
let superAdminToken = '';
let createdTicketId = '';

// Helper function to make API calls
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
api.interceptors.request.use((config) => {
  if (config.useUserToken && userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  } else if (config.useSuperAdminToken && superAdminToken) {
    config.headers.Authorization = `Bearer ${superAdminToken}`;
  }
  return config;
});

// Test functions
async function loginUser() {
  console.log('\n📝 Test 1: User Login');
  try {
    const response = await api.post('/auth/login', TEST_USER);
    userToken = response.data.data.token;
    console.log('✅ User login successful');
    console.log(`   Token: ${userToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('❌ User login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function loginSuperAdmin() {
  console.log('\n📝 Test 2: Super Admin Login');
  try {
    const response = await api.post('/auth/login', TEST_SUPER_ADMIN);
    superAdminToken = response.data.data.token;
    console.log('✅ Super admin login successful');
    console.log(`   Token: ${superAdminToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('❌ Super admin login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createTicket() {
  console.log('\n📝 Test 3: Create Ticket');
  try {
    const ticketData = {
      title: 'Test ticket - Cannot assign node to parking slot',
      description: 'When I try to assign node ABC123 to parking slot A1, I get an error saying "Slot already assigned". Please help!',
      category: 'technical',
      priority: 'high',
    };

    const response = await api.post('/tickets', ticketData, { useUserToken: true });
    createdTicketId = response.data.data.id;
    console.log('✅ Ticket created successfully');
    console.log(`   Ticket ID: ${createdTicketId}`);
    console.log(`   Ticket Number: ${response.data.data.ticketNumber}`);
    console.log(`   Status: ${response.data.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Create ticket failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getAllTickets() {
  console.log('\n📝 Test 4: Get All Tickets (User)');
  try {
    const response = await api.get('/tickets?page=1&limit=10', { useUserToken: true });
    console.log('✅ Tickets fetched successfully');
    console.log(`   Total tickets: ${response.data.data.meta.total}`);
    console.log(`   Current page: ${response.data.data.meta.page}`);
    return true;
  } catch (error) {
    console.error('❌ Get tickets failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getTicketById() {
  console.log('\n📝 Test 5: Get Ticket By ID');
  try {
    const response = await api.get(`/tickets/${createdTicketId}`, { useUserToken: true });
    console.log('✅ Ticket fetched successfully');
    console.log(`   Title: ${response.data.data.title}`);
    console.log(`   Status: ${response.data.data.status}`);
    console.log(`   Priority: ${response.data.data.priority}`);
    return true;
  } catch (error) {
    console.error('❌ Get ticket by ID failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function sendMessage() {
  console.log('\n📝 Test 6: Send Message (User)');
  try {
    const messageData = {
      message: 'I have also tried restarting the gateway but the issue persists.',
    };

    const response = await api.post(`/tickets/${createdTicketId}/messages`, messageData, {
      useUserToken: true,
    });
    console.log('✅ Message sent successfully');
    console.log(`   Message ID: ${response.data.data.id}`);
    console.log(`   Sender: ${response.data.data.senderName}`);
    return true;
  } catch (error) {
    console.error('❌ Send message failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function superAdminReply() {
  console.log('\n📝 Test 7: Super Admin Reply');
  try {
    const messageData = {
      message: 'Thank you for reporting this issue. I can see that slot A1 is indeed already assigned to node XYZ789. Let me unassign it for you.',
    };

    const response = await api.post(`/tickets/${createdTicketId}/messages`, messageData, {
      useSuperAdminToken: true,
    });
    console.log('✅ Super admin reply sent successfully');
    console.log(`   Message ID: ${response.data.data.id}`);
    console.log(`   Sender: ${response.data.data.senderName}`);
    return true;
  } catch (error) {
    console.error('❌ Super admin reply failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getMessages() {
  console.log('\n📝 Test 8: Get All Messages');
  try {
    const response = await api.get(`/tickets/${createdTicketId}/messages`, { useUserToken: true });
    console.log('✅ Messages fetched successfully');
    console.log(`   Total messages: ${response.data.data.length}`);
    response.data.data.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.senderName}: ${msg.message.substring(0, 50)}...`);
    });
    return true;
  } catch (error) {
    console.error('❌ Get messages failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function updateTicketStatus() {
  console.log('\n📝 Test 9: Update Ticket Status (Super Admin)');
  try {
    const updateData = {
      status: 'in_progress',
    };

    const response = await api.put(`/tickets/${createdTicketId}`, updateData, {
      useSuperAdminToken: true,
    });
    console.log('✅ Ticket status updated successfully');
    console.log(`   New status: ${response.data.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Update ticket status failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getStatistics() {
  console.log('\n📝 Test 10: Get Statistics');
  try {
    const response = await api.get('/tickets/statistics', { useSuperAdminToken: true });
    console.log('✅ Statistics fetched successfully');
    console.log(`   Total tickets: ${response.data.data.totalTickets}`);
    console.log(`   Open tickets: ${response.data.data.openTickets}`);
    console.log(`   In Progress: ${response.data.data.inProgressTickets}`);
    console.log(`   Resolved: ${response.data.data.resolvedTickets}`);
    return true;
  } catch (error) {
    console.error('❌ Get statistics failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function resolveTicket() {
  console.log('\n📝 Test 11: Resolve Ticket');
  try {
    const updateData = {
      status: 'resolved',
    };

    const response = await api.put(`/tickets/${createdTicketId}`, updateData, {
      useSuperAdminToken: true,
    });
    console.log('✅ Ticket resolved successfully');
    console.log(`   New status: ${response.data.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Resolve ticket failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getUnreadCount() {
  console.log('\n📝 Test 12: Get Unread Count (User)');
  try {
    const response = await api.get('/tickets/unread-count', { useUserToken: true });
    console.log('✅ Unread count fetched successfully');
    console.log(`   Unread messages: ${response.data.data.count}`);
    return true;
  } catch (error) {
    console.error('❌ Get unread count failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Support Ticket API Tests');
  console.log(`📍 API URL: ${API_URL}`);
  console.log('=' .repeat(60));

  const tests = [
    loginUser,
    loginSuperAdmin,
    createTicket,
    getAllTickets,
    getTicketById,
    sendMessage,
    superAdminReply,
    getMessages,
    updateTicketStatus,
    getStatistics,
    resolveTicket,
    getUnreadCount,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    // Wait a bit between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
}

// Run the tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

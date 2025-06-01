/**
 * Chat Routes for Taxi-Express
 * Handles chat functionality between drivers and clients
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/chat/send:
 *   post:
 *     summary: Send a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tripId
 *               - message
 *             properties:
 *               tripId:
 *                 type: string
 *                 description: ID of the trip
 *               message:
 *                 type: string
 *                 description: Message content
 *               messageType:
 *                 type: string
 *                 enum: [text, location, image]
 *                 default: text
 *                 description: Type of message
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Server error
 */
router.post('/send', authenticate, chatController.sendMessage);

/**
 * @swagger
 * /api/chat/{tripId}/history:
 *   get:
 *     summary: Get chat history for a trip
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the trip
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Server error
 */
router.get('/:tripId/history', authenticate, chatController.getChatHistory);

/**
 * @swagger
 * /api/chat/{tripId}/read:
 *   patch:
 *     summary: Mark messages as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the trip
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of message IDs to mark as read
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Server error
 */
router.patch('/:tripId/read', authenticate, chatController.markMessagesAsRead);

/**
 * @swagger
 * /api/chat/unread:
 *   get:
 *     summary: Get unread message count
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread message count retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/unread', authenticate, chatController.getUnreadMessageCount);

/**
 * @swagger
 * /api/chat/location:
 *   post:
 *     summary: Send a location message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tripId
 *               - latitude
 *               - longitude
 *             properties:
 *               tripId:
 *                 type: string
 *                 description: ID of the trip
 *               latitude:
 *                 type: number
 *                 format: float
 *                 description: Latitude coordinate
 *               longitude:
 *                 type: number
 *                 format: float
 *                 description: Longitude coordinate
 *               address:
 *                 type: string
 *                 description: Optional address of the location
 *     responses:
 *       201:
 *         description: Location message sent successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Server error
 */
router.post('/location', authenticate, chatController.sendLocationMessage);

module.exports = router;

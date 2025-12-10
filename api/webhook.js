const axios = require('axios');

// --- НАСТРОЙКИ ---
// ЗАМЕНИТЕ ЭТОТ ТОКЕН НА ТОКЕН ВАШЕГО БОТА ИЗ BOTFATHER
const API_TOKEN = "8030516887:AAE8v-4fxeuMefTGQG2Rtmo949c_ZRlNu5I"; 
const API_URL = `https://api.telegram.org/bot${API_TOKEN}`;
// ЭТО ID ВАШЕГО КАНАЛА
const CHANNEL_ID = "-1001987601682"; 
// ЭТО ЮЗЕРНЕЙМ ВАШЕГО КАНАЛА (без @)
const CHANNEL_USERNAME = "shenscrunchies"; 
const PROMO_TEXT = "Спасибо за подписку! А вот и промокод: SHENTG10. Промокод даёт скидку в 10% на заказ через OZON, действует до 27 мая 2026 г.";
const SUBSCRIPTION_TEXT = "Подписывайтесь на наш канал — и мы подарим вам скидку 10% на заказ через OZON!";
// -----------------


/**
 * 1. Функция для отправки простого сообщения
 */
async function sendMessage(chatId, message) {
    try {
        await axios.post(`${API_URL}/sendMessage`, {
            chat_id: chatId,
            text: message,
        });
        return true;
    } catch (error) {
        console.error("Ошибка при отправке сообщения:", error.response?.data || error.message);
        return false;
    }
}

/**
 * 2. Функция для отправки сообщения с кнопками
 */
async function sendMessageWithKeyboard(chatId, message, replyMarkup) {
    try {
        await axios.post(`${API_URL}/sendMessage`, {
            chat_id: chatId,
            text: message,
            reply_markup: replyMarkup
        });
        return true;
    } catch (error) {
        console.error("Ошибка при отправке сообщения с кнопками:", error.response?.data || error.message);
        return false;
    }
}

/**
 * 3. Проверка подписки на канал
 */
async function isUserSubscribed(userId, debugChatId) {
    try {
        const response = await axios.get(`${API_URL}/getChatMember`, {
            params: {
                chat_id: CHANNEL_ID,
                user_id: userId
            }
        });
        
        const status = response.data.result.status;
        
        if (status === "member" || status === "administrator" || status === "creator") {
            return true;
        } else {
            return false;
        }

    } catch (error) {
        const errorData = error.response?.data;
        if (errorData) {
            // Эта строка нужна для отладки, если что-то пойдет не так
            // await sendMessage(debugChatId, `Ошибка проверки подписки: ${errorData.description}`);
            console.error(`Ошибка проверки подписки: ${errorData.description}`);
        } else {
            // await sendMessage(debugChatId, `Неизвестная ошибка: ${error.message}`);
            console.error(`Неизвестная ошибка: ${error.message}`);
        }
        return false;
    }
}

/**
 * 4. Основная логика: Проверяет подписку и отправляет промокод или запрос
 */
async function checkAndSendPromo(chatId, userId) {
    if (await isUserSubscribed(userId, chatId)) {
        await sendMessage(chatId, PROMO_TEXT);
    } else {
        const keyboard = {
            inline_keyboard: [
                [{ text: '👉 Подписаться на канал', url: `https://t.me/${CHANNEL_USERNAME}` }],
                [{ text: '✅ Я подписался (Проверить)', callback_data: 'check_subscription' }]
            ]
        };
        await sendMessageWithKeyboard(chatId, SUBSCRIPTION_TEXT, keyboard);
    }
}

/**
 * 5. Главная функция-обработчик Vercel Webhook
 */
module.exports = async (req, res) => {
    // Получаем входящие данные от Telegram
    const update = req.body;

    // --- Обработка callback-кнопки ---
    if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const userId = update.callback_query.from.id;
        const data = update.callback_query.data;
        const callbackId = update.callback_query.id; 

        if (data === 'check_subscription') {
            await checkAndSendPromo(chatId, userId);
        }
        
        // Отправка ответа Telegram, что callback обработан (ОБЯЗАТЕЛЬНО!)
        try {
             await axios.post(`${API_URL}/answerCallbackQuery`, {
                callback_query_id: callbackId,
                text: 'Проверка подписки выполнена!' 
            });
        } catch (error) {
            console.error("Ошибка answerCallbackQuery:", error.response?.data || error.message);
        }


    // --- Обработка текстового сообщения (/start) ---
} else if (update.message) {
    const chatId = update.message.chat.id;
    const userId = update.message.from.id;
    const text = update.message.text; // <-- ДОБАВЛЕНА ЭТА СТРОКА
    
    // ЭТА СТРОКА ДЛЯ ОТЛАДКИ: проверяем, может ли бот ответить
    await sendMessage(chatId, "Получил ваш запрос. Теперь проверяю подписку...");

    if (text && text.startsWith('/start')) {
        await checkAndSendPromo(chatId, userId);
    }
}
    // Всегда отправляем ответ Vercel, что запрос обработан успешно
    res.status(200).send('OK');
};

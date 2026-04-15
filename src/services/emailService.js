/**
 * Minimalist email service to handle custom category requests.
 * In a real production app, you would use EmailJS, SendGrid, or a custom backend.
 */

export const sendCustomCategoryRequest = async (categoryDescription, userLocation) => {
    console.log('--- Custom Category Request ---');
    console.log('Description:', categoryDescription);
    console.log('Location:', userLocation);

    // Simulated API call
    return new Promise((resolve) => {
        setTimeout(() => {
            // Integration hint: 
            // if (EmailJS) { 
            //   return emailjs.send('service_id', 'template_id', { ... });
            // }

            console.log('Email successfully simulated as sent to admin.');
            resolve({ success: true, message: 'Request sent successfully' });
        }, 1000);
    });
};

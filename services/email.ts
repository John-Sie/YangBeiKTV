
// NOTE: In a production environment, API calls should be made from a backend server
// to avoid exposing the API Key in the frontend code.
// Resend (and most Email APIs) blocks CORS requests from browsers for security.
// 
// To allow this app to function without a dedicated backend, we will 
// SIMULATE the email sending by logging the content to the console.

export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
    console.group('📧 Email Service Simulation (Console Only)');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    
    // Extract the link for easier clicking in console for testing
    const linkMatch = htmlContent.match(/href="(.*?)"/);
    if (linkMatch) {
        console.log(`🔗 驗證/重設連結 (請點擊此處啟用): ${linkMatch[1]}`);
    }
    
    console.groupEnd();

    // Simulate network delay to make UI feel realistic
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return fake success to allow the UI flow to proceed
    return { id: 'simulated_' + Date.now() };
};

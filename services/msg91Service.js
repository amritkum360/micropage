const axios = require('axios');

class MSG91Service {
  constructor() {
    this.apiKey = '467264AmCR16HRYo68bf9886P1';
    this.baseUrl = 'https://control.msg91.com/api/v5/email/send';
  }

  async sendWelcomeEmail(userEmail, userName) {
    try {
      console.log('📧 Sending welcome email via MSG91 to:', userEmail);
      
      const emailData = {
        recipients: [
          {
            to: [
              {
                email: userEmail,
                name: userName
              }
            ],
            variables: {
              name: userName,
              activation_link: "https://aboutwebsite.in/dashboard"
            }
          }
        ],
        from: {
          email: "no-reply@mail.aboutwebsite.in"
        },
        domain: "mail.aboutwebsite.in",
        template_id: "template_09_09_2025_12_09_3"
      };

      const response = await axios.post(this.baseUrl, emailData, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "authkey": this.apiKey
        }
      });

      console.log('✅ Welcome email sent successfully via MSG91:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Failed to send welcome email via MSG91:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    try {
      console.log('📧 Sending password reset email via MSG91 to:', userEmail);
      
      const resetUrl = `https://aboutwebsite.in/reset-password?token=${resetToken}`;
      
      const emailData = {
        recipients: [
          {
            to: [
              {
                email: userEmail,
                name: userName
              }
            ],
         	variables: {
              username: userName,
              resetLink: resetUrl
            }
          }
        ],
        from: {
          email: "no-reply@mail.aboutwebsite.in"
        },
        domain: "mail.aboutwebsite.in",
                template_id: "template_13_09_2025_20_09_2"
      };

      const response = await axios.post(this.baseUrl, emailData, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "authkey": this.apiKey
        }
      });

      console.log('✅ Password reset email sent successfully via MSG91:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Failed to send password reset email via MSG91:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Additional email methods can be added here for other email types
  // For now, we're using MSG91 template-based approach for welcome emails
}

module.exports = new MSG91Service();

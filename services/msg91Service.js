const axios = require('axios');

class MSG91Service {
  constructor() {
    this.apiKey = '467264AmCR16HRYo68bf9886P1';
    this.baseUrl = 'https://api.msg91.com/api/v5/email/send';
  }

  async sendWelcomeEmail(userEmail, userName) {
    try {
      const emailData = {
        to: [
          {
            email: userEmail,
            name: userName
          }
        ],
         from: {
           email: 'noreply@aboutwebsite.in',
           name: 'AboutWebsite Team'
         },
        subject: 'Welcome to AboutWebsite! 🎉',
        html: this.getWelcomeEmailTemplate(userName),
        text: this.getWelcomeEmailText(userName)  
      };

      const response = await axios.post(this.baseUrl, emailData, {
        headers: {
          'Content-Type': 'application/json',
          'authkey': this.apiKey
        }
      });

      console.log('✅ Welcome email sent successfully:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  getWelcomeEmailTemplate(userName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>Welcome to AboutWebsite</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #a540f7;
                margin-bottom: 10px;
            }
            .welcome-title {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .highlight {
                background-color: #f8f9fa;
                padding: 15px;
                border-left: 4px solid #a540f7;
                margin: 20px 0;
            }
            .cta-button {
                display: inline-block;
                background-color: #a540f7;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .features {
                margin: 20px 0;
            }
            .feature {
                margin: 10px 0;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                 <div class="logo">🚀 AboutWebsite</div>
                 <h1 class="welcome-title">Welcome to AboutWebsite, ${userName}! 🎉</h1>
            </div>
            
            <div class="content">
                <p>Thank you for joining AboutWebsite! We're excited to have you on board and help you create amazing websites with ease.</p>
                
                <div class="highlight">
                    <strong>🎯 What's Next?</strong><br>
                    Your account has been successfully created. You can now start building your professional website using our intuitive drag-and-drop builder.
                </div>
                
                <div class="features">
                     <h3>🌟 What you can do with AboutWebsite:</h3>
                    <div class="feature">📱 Create responsive websites that work on all devices</div>
                    <div class="feature">🎨 Choose from beautiful, professional templates</div>
                    <div class="feature">⚡ Build and publish your site in minutes</div>
                    <div class="feature">🔧 Easy-to-use drag-and-drop interface</div>
                    <div class="feature">📊 Built-in analytics and SEO optimization</div>
                </div>
                
                <div style="text-align: center;">
                     <a href="https://aboutwebsite.in/dashboard" class="cta-button">Get Started Now</a>
                </div>
                
                <p>If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help you succeed!</p>
            </div>
            
            <div class="footer">
                 <p>Best regards,<br>The AboutWebsite Team</p>
                 <p>📧 support@aboutwebsite.in | 🌐 <a href="https://aboutwebsite.in">aboutwebsite.in</a></p>
                <p><small>This email was sent to ${userEmail}. If you didn't create an account with us, please ignore this email.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getWelcomeEmailText(userName) {
    return `
 Welcome to AboutWebsite, ${userName}! 🎉
 
 Thank you for joining AboutWebsite! We're excited to have you on board and help you create amazing websites with ease.

🎯 What's Next?
Your account has been successfully created. You can now start building your professional website using our intuitive drag-and-drop builder.

🌟 What you can do with AboutWebsite:
📱 Create responsive websites that work on all devices
🎨 Choose from beautiful, professional templates
⚡ Build and publish your site in minutes
🔧 Easy-to-use drag-and-drop interface
📊 Built-in analytics and SEO optimization

 Get Started Now: https://aboutwebsite.in/dashboard

If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help you succeed!

 Best regards,
 The AboutWebsite Team
 
 📧 support@aboutwebsite.in | 🌐 aboutwebsite.in

This email was sent to your registered email address. If you didn't create an account with us, please ignore this email.
    `;
  }
}

module.exports = new MSG91Service();

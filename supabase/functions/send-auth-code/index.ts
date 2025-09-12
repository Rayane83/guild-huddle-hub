import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuthCodeRequest {
  email: string;
  code: string;
  type: 'login' | 'password_reset';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, type }: AuthCodeRequest = await req.json();

    const subject = type === 'login' ? 
      'Code de connexion - Portail Superadmin Flashback Fa' : 
      'Réinitialisation de mot de passe - Portail Superadmin';

    const html = type === 'login' ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
          <h1>Connexion Superadmin</h1>
          <p>Portail Entreprise Flashback Fa</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Votre code de connexion</h2>
          <p>Utilisez ce code pour vous connecter au portail superadmin :</p>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; color: #667eea; border: 2px dashed #667eea; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes pour votre sécurité.</p>
          <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
        </div>
        <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
          <p>Portail Entreprise Flashback Fa - Système d'authentification sécurisé</p>
        </div>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; text-align: center;">
          <h1>Réinitialisation de mot de passe</h1>
          <p>Portail Entreprise Flashback Fa</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Nouveau mot de passe temporaire</h2>
          <p>Un superadmin a réinitialisé votre mot de passe. Voici votre nouveau mot de passe temporaire :</p>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; color: #f5576c; border: 2px solid #f5576c; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;"><strong>Important :</strong> Changez ce mot de passe lors de votre prochaine connexion.</p>
          <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement un superadmin.</p>
        </div>
        <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
          <p>Portail Entreprise Flashback Fa - Système d'authentification sécurisé</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Portail Superadmin <noreply@flashbackfa.com>",
      to: [email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: type === 'login' ? 'Code envoyé' : 'Nouveau mot de passe envoyé'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-auth-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
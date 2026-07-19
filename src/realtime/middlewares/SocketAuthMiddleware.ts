import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { SocketAuthenticationError } from "../errors/index.js";
import { RealtimeLogger } from "../utils/Logger.js";

/**
 * Socket.IO Connection Authenticator Middleware.
 * Secures socket sockets, extracts tokens from queries/headers, and maps verified identity.
 */
export class SocketAuthMiddleware {
  private static JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_for_rose_amour_2026";

  public static authenticate() {
    return (socket: Socket, next: (err?: Error) => void) => {
      try {
        // Resolve JWT from connection params (auth handshake or headers)
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.query?.token ||
          socket.handshake.headers["authorization"]?.split(" ")[1];

        if (!token) {
          RealtimeLogger.warn("Auth", "Rejection: No credential tokens specified on handshake.", {
            id: socket.id,
            ip: socket.handshake.address
          });
          return next(new SocketAuthenticationError("Session invalide. Jeton d'accès manquant."));
        }

        // Verify secret signature
        jwt.verify(token, this.JWT_SECRET, (err: any, decoded: any) => {
          if (err) {
            RealtimeLogger.warn("Auth", "Rejection: Invalid token claims or signature.", {
              id: socket.id,
              error: err.message
            });
            return next(new SocketAuthenticationError("Signature de session invalide ou expirée."));
          }

          if (!decoded || !decoded.id) {
            return next(new SocketAuthenticationError("Profil d'identité invalide dans les revendications."));
          }

          // Inject credentials into Socket Context
          socket.data.user = {
            id: decoded.id,
            name: decoded.name || "Utilisateur Anonyme",
            role: decoded.role || "user",
            email: decoded.email
          };

          RealtimeLogger.info("Auth", `User successfully mapped: ${decoded.id} (${decoded.name})`, {
            id: socket.id,
            ip: socket.handshake.address
          });

          return next();
        });
      } catch (fatalErr: any) {
        RealtimeLogger.error("Auth", "Fatal error during handshake parsing.", fatalErr);
        return next(new SocketAuthenticationError("Échec critique de l'intercepteur de sécurité."));
      }
    };
  }
}

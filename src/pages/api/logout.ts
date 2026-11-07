import type { APIRoute } from 'astro';
import { logoutUser } from '../../services/logout';

export const POST: APIRoute = (context) => logoutUser(context);

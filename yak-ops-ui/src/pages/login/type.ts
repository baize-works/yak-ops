// Compatibility forwarding module. New login code should import the account
// service directly so all authentication methods share Security semantics.
export { googleLogin } from '@/services/security/account';

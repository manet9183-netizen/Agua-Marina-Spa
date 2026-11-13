import { StyleSheet } from 'react-native';

export const loginStyles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#121212',
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
    marginTop: 40,
  },
  logoText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
  },
  subtitle: {
    color: '#6b21a8',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 4,
  },
  description: {
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
  },
  roleActive: {
    borderColor: '#6b21a8',
    backgroundColor: '#f3e8ff',
  },
  roleTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#111',
  },
  roleSub: {
    fontSize: 11,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  showButton: {
    position: 'absolute',
    right: 12,
  },
  showText: {
    color: '#6b21a8',
    fontWeight: '600',
  },
  rowOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkboxText: {
    fontSize: 12,
    color: '#555',
  },
  linkText: {
    fontSize: 12,
    color: '#6b21a8',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#6b21a8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dividerText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginVertical: 15,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 13,
  },
  signUpText: {
    color: '#6b21a8',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
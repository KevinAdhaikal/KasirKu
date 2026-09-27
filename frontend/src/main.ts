import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) {
  throw new Error('Element #app not found in document');
}

const app = mount(App, {
  target,
});

export default app;

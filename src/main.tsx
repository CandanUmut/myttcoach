import { render } from 'preact';
import './design/fonts';
import './design/tokens.css';
import './design/base.css';
import './ui/app.css';
import './ui/screens/styleboard.css';
import { App } from './ui/App';

render(<App />, document.getElementById('app')!);

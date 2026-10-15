import { render } from 'preact';
import './design/fonts';
import './design/tokens.css';
import './design/base.css';
import './ui/app.css';
import './ui/screens/styleboard.css';
import './ui/screens/screens.css';
import { App } from './ui/App';
import { init } from './ui/state';
import './ui/screens/forms.css';

render(<App />, document.getElementById('app')!);
void init();

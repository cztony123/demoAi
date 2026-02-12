import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// 引入Vant组件
import {
  Button,
  Uploader,
  Slider,
  Field,
  Image,
  Cell,
  CellGroup,
  Popup,
  Icon
} from 'vant';
// 引入组件样式
import 'vant/lib/index.css';

const app = createApp(App);
app.use(store);
app.use(router);
app.use(Button);
app.use(Uploader);
app.use(Slider);
app.use(Field);
app.use(Image);
app.use(Cell);
app.use(CellGroup);
app.use(Popup);
app.use(Icon);

app.mount('#app')

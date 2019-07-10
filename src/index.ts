import { RiotComponent} from 'riot'

type SingleSpaRiotRootComponent = (el: HTMLElement, initialProps?: any) => RiotComponent

interface SingleSpaRiotOptions {
  rootComponent?: SingleSpaRiotRootComponent
  loadRootComponent?: () => Promise<SingleSpaRiotRootComponent>
  domElementGetter: () => HTMLElement
}

interface MountedInstances {
  instance?: RiotComponent
}

export default function singleSpaRiot(opts: SingleSpaRiotOptions) {
  if (typeof opts !== 'object') {
    throw new Error(`single-spa-riot requires a configuration object`);
  }

  if (!opts.rootComponent && !opts.loadRootComponent) {
    throw new Error('single-spa-riot must be passed `rootComponent` or `loadRootComponent`');
  }

  let mountedInstances = {};

  return {
    bootstrap: bootstrap.bind(null, opts) as () => Promise<SingleSpaRiotRootComponent>,
    mount: mount.bind(null, opts, mountedInstances) as (props?: any) => Promise<void>,
    update: update.bind(null, opts, mountedInstances) as (props?: any) => Promise<void>,
    unmount: unmount.bind(null, opts, mountedInstances) as () => Promise<void>,
  };
}

const bootstrap =  (opts: SingleSpaRiotOptions) => {
  if (opts.loadRootComponent) {
    return opts.loadRootComponent().then(root => opts.rootComponent = root)
  } else {
    return Promise.resolve(opts.rootComponent);
  }
}


function mount(opts: SingleSpaRiotOptions, mountedInstances: MountedInstances, props?: any) {
  return Promise
    .resolve()
    .then(() => {
      const domElementGetter = chooseDomElementGetter(opts, props)
      const domElement = getRootDomEl(domElementGetter)
      const mountApp = opts.rootComponent as SingleSpaRiotRootComponent
      mountedInstances.instance = mountApp(domElement, props)
    })
}

function update(opts: SingleSpaRiotOptions, mountedInstances: MountedInstances, props: any) {
  return new Promise(resolve => {
    mountedInstances.instance && mountedInstances.instance.update(props)
    resolve();
  })
}

function unmount(opts: SingleSpaRiotOptions, mountedInstances: MountedInstances) {
  return Promise
    .resolve()
    .then(() => {
      mountedInstances.instance && mountedInstances.instance.unmount(true);
      delete mountedInstances.instance;
    })
}

function chooseDomElementGetter(opts: SingleSpaRiotOptions, props) {
  const name = props.appName || props.name
  props = props && props.customProps ? props.customProps : props
  if (props.domElement) {
    return () => props.domElement
  } else if (props.domElementGetter) {
    return props.domElementGetter
  } else if(opts.domElementGetter) {
    return opts.domElementGetter
  }
  return defaultDomElementGetter(name)
}

function defaultDomElementGetter(name) {
  const htmlId = `single-spa-application:${name}`

  return function defaultDomEl() {
    let domElement = document.getElementById(htmlId)
    if (!domElement) {
      domElement = document.createElement('div')
      domElement.id = htmlId
      document.body.appendChild(domElement)
    }
    return domElement
  }
}

function getRootDomEl(domElementGetter) {
  const el = domElementGetter();
  if (!el) {
    throw new Error(`single-spa-riot: domElementGetter function did not return a valid dom element`);
  }

  return el;
}
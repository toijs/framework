/**
 * Example 3 — Multiple modules
 *
 * AppModule (optional aggregator)
 * ├── UserModule
 * ├── OrderModule
 * └── NotificationModule
 *
 * Note: `dependencies` are resolved AFTER the parent is recorded.
 * A flat `.modules([UserModule, OrderModule, NotificationModule])` is clearer.
 */
import { Injectable, Launcher, type Module } from "@toijs/modular";

@Injectable()
class UserService {
  find() {
    return { id: "u1" };
  }
}

@Injectable()
class OrderService {
  find() {
    return { id: "o1", userId: "u1" };
  }
}

@Injectable([UserService, OrderService])
class NotificationService {
  constructor(
    private readonly users: UserService,
    private readonly orders: OrderService,
  ) {}

  notify() {
    return { user: this.users.find(), order: this.orders.find() };
  }
}

function UserModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([UserService]);
  };
  return { name: "feature.user", prepare };
}

function OrderModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([OrderService]);
  };
  return { name: "feature.order", prepare };
}

function NotificationModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([NotificationService]);
  };

  const ready = () => {
    const notifications = launcher.container.resolve(NotificationService);
    console.log(notifications.notify());
  };

  return { name: "feature.notification", prepare, ready };
}

await new Launcher()
  .modules([UserModule, OrderModule, NotificationModule])
  .start();
// Expected: { user: { id: 'u1' }, order: { id: 'o1', userId: 'u1' } }

/**
 * Example 5 — SQS worker (application pattern)
 *
 * SQS → your poller → Application module → Service → Repository
 *
 * @toijs/modular does not include AWS SQS. Replace `poll()` with the AWS SDK
 * or any consumer. This file only shows bootstrap + DI.
 */
import { Injectable, Launcher, type Module } from "@toijs/modular";

type Job = { id: string; body: string };

@Injectable()
class JobRepository {
  async save(job: Job) {
    return job;
  }
}

@Injectable([JobRepository])
class JobService {
  constructor(private readonly jobs: JobRepository) {}

  async handle(body: string) {
    return this.jobs.save({ id: crypto.randomUUID(), body });
  }
}

export function WorkerModule(launcher: Launcher): Module {
  const prepare = () => {
    launcher.container.register([JobRepository, JobService]);
  };

  return { name: "feature.worker", prepare };
}

export async function bootstrapWorker() {
  const launcher = new Launcher();
  await launcher.modules([WorkerModule]).start();
  return launcher.container.resolve(JobService);
}

async function poll(): Promise<Array<{ body: string }>> {
  return [];
}

const jobs = await bootstrapWorker();

for (const message of await poll()) {
  await jobs.handle(message.body);
}

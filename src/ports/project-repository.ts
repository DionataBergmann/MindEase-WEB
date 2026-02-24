import type { Project } from "@/domain/project";

/**
 * Porta (interface) para acesso a projetos.
 * O domínio não conhece Firestore; o adapter implementa esta interface.
 */
export interface IProjectRepository {
  getByUserId(userId: string): Promise<Project[]>;
  getById(projectId: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  delete(projectId: string): Promise<void>;
}
